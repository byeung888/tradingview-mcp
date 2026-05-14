import CDP from 'chrome-remote-interface';

const CDP_HOST = '127.0.0.1';
const CDP_PORT = 9222;

let client = null;
let targetInfo = null;

export async function getClient() {
  if (client) {
    try {
      await client.Runtime.evaluate({ expression: '1', returnByValue: true });
      return client;
    } catch {
      client = null;
      targetInfo = null;
    }
  }
  return connect();
}

export async function connect() {
  const target = await findChartTarget();
  if (!target) throw new Error('No TradingView chart page found. Is TV Desktop open with a chart?');
  targetInfo = target;
  client = await CDP({ host: CDP_HOST, port: CDP_PORT, target: target.id });
  await client.Runtime.enable();
  return client;
}

async function findChartTarget() {
  const targets = await CDP.List({ host: CDP_HOST, port: CDP_PORT });
  return targets.find(t => t.type === 'page' && /tradingview\.com\/chart/i.test(t.url)) || null;
}

export async function evaluate(expression, opts = {}) {
  const c = await getClient();
  const result = await c.Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: opts.awaitPromise ?? false,
    ...opts,
  });
  if (result.exceptionDetails) {
    const msg = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Unknown error';
    throw new Error(`JS evaluation error: ${msg}`);
  }
  return result.result?.value;
}

export async function disconnect() {
  if (client) {
    try { await client.close(); } catch {}
    client = null;
    targetInfo = null;
  }
}

// ── TV Desktop 3.1.0 API helpers ──

function _chartPath() {
  return 'window._exposed_chartWidgetCollection.activeChartWidget.value()';
}

function _modelPath() {
  return `${_chartPath()}._modelWV.value().m_model`;
}

function _panePath(paneIndex = 0) {
  return `${_modelPath()}._panes[${paneIndex}]`;
}

function _sourcesPath(paneIndex = 0) {
  return `${_panePath(paneIndex)}.m_dataSources`;
}

export async function getSources(paneIndex = 0) {
  const expr = `
    (() => {
      const sources = ${_sourcesPath(paneIndex)};
      const out = {};
      for (const [k, v] of Object.entries(sources)) {
        out[k] = { name: v.name(), id: v.id ? v.id() : k };
      }
      return out;
    })()
  `;
  return evaluate(expr);
}

export async function getSymbol() {
  const expr = `${_chartPath()}.getSymbol()`;
  return evaluate(expr);
}

export async function getResolution() {
  const expr = `${_chartPath()}.getResolution()`;
  return evaluate(expr);
}

export async function getBars(sourceId, groupId = '0', paneIndex = 0) {
  const expr = `
    (() => {
      const source = ${_sourcesPath(paneIndex)}['${sourceId}'];
      if (!source) throw new Error('Source ${sourceId} not found');
      const group = source._graphicsPriceRangeGroups['${groupId}'];
      if (!group) throw new Error('Group ${groupId} not found');
      const bars = group._bars._items;
      return bars.map(b => b.value);
    })()
  `;
  return evaluate(expr);
}

export async function getSourceData(sourceId, paneIndex = 0) {
  const expr = `
    (() => {
      const source = ${_sourcesPath(paneIndex)}['${sourceId}'];
      if (!source) throw new Error('Source ${sourceId} not found');
      const data = source._data._items;
      return data.map(b => b.value);
    })()
  `;
  return evaluate(expr);
}

export async function getAlerts(sourceId, paneIndex = 0) {
  const expr = `
    (() => {
      const source = ${_sourcesPath(paneIndex)}['${sourceId}'];
      if (!source) throw new Error('Source ${sourceId} not found');
      const alerts = source._alertSourceModel._alerts;
      return alerts;
    })()
  `;
  return evaluate(expr);
}

export async function getPineSourceCode(sourceId, paneIndex = 0) {
  const expr = `
    (() => {
      const source = ${_sourcesPath(paneIndex)}['${sourceId}'];
      if (!source) throw new Error('Source ${sourceId} not found');
      const model = source._pineSourceCodeModel;
      return model ? { id: model._id, version: model._version } : null;
    })()
  `;
  return evaluate(expr);
}

export async function changeSymbol(symbol) {
  const expr = `${_chartPath()}.setSymbol(${JSON.stringify(symbol)})`;
  return evaluate(expr);
}

export async function changeResolution(resolution) {
  const expr = `${_chartPath()}.setResolution(${JSON.stringify(resolution)})`;
  return evaluate(expr);
}

export async function takeScreenshot() {
  const c = await getClient();
  const { data } = await c.Page.captureScreenshot({ format: 'png' });
  return data;
}
