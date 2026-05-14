/**
 * Atif's Liquidity Toolkit — Model Fixer
 *
 * This script patches the indicator's behavior so that each Model
 * actually isolates its features. It works by mutating the indicator's
 * input properties via CDP to turn off unrelated features when a model
 * is selected.
 *
 * Model A: Liquidity Sweep + FVG
 *   - Keeps: Pools, Sweeps, FVGs
 *   - Disables: Fibonacci, OTE, Trend, Model C signals
 *
 * Model B: Trend + OTE Fibonacci
 *   - Keeps: Fibonacci, OTE, Trend, Swing Structure
 *   - Disables: Pools, Sweeps, FVGs, Model C signals
 *
 * Model C: HTF FVG + LTF FVG Entry
 *   - Keeps: HTF FVG, LTF FVG, Model C signals
 *   - Disables: Pools, Sweeps, Fibonacci, OTE, Trend
 *
 * Usage:
 *   node src/atif_models.cjs <A|B|C|ALL>
 */

const CDP = require('chrome-remote-interface');

const MODEL_CONFIGS = {
  A: {
    // Model A features
    in_0: true,   // Enable Model A
    in_1: false,  // Disable Model B
    in_2: false,  // Disable Model C

    // Pools (Model A)
    in_11: true,  // Show Buyside Pools
    in_12: true,  // Show Sellside Pools

    // Sweeps (Model A)
    in_16: true,  // Show Sweep Labels

    // FVG (Model A)
    in_18: true,  // Show Bullish FVGs
    in_19: true,  // Show Bearish FVGs
    in_21: true,  // Show FVG Labels
    in_22: true,  // Show Inverted FVGs

    // Disable Model B features
    in_24: false, // Show Fibonacci Levels
    in_25: false, // Show Fibonacci Labels
    in_28: false, // Highlight OTE Zone

    // Disable Model C features
    in_7: false,  // Show HTF FVG Boxes
    in_8: false,  // Show LTF FVG Boxes
    in_9: false,  // Show Model C Signal Arrows

    // General signals
    in_31: true,  // Show Buy/Sell Signal Arrows
  },

  B: {
    // Model B features
    in_0: false,  // Disable Model A
    in_1: true,   // Enable Model B
    in_2: false,  // Disable Model C

    // Disable Model A features
    in_11: false, // Show Buyside Pools
    in_12: false, // Show Sellside Pools
    in_16: false, // Show Sweep Labels
    in_18: false, // Show Bullish FVGs
    in_19: false, // Show Bearish FVGs
    in_21: false, // Show FVG Labels
    in_22: false, // Show Inverted FVGs

    // Fibonacci / OTE (Model B)
    in_24: true,  // Show Fibonacci Levels
    in_25: true,  // Show Fibonacci Labels
    in_28: true,  // Highlight OTE Zone

    // Disable Model C features
    in_7: false,  // Show HTF FVG Boxes
    in_8: false,  // Show LTF FVG Boxes
    in_9: false,  // Show Model C Signal Arrows

    // General signals
    in_31: true,  // Show Buy/Sell Signal Arrows
  },

  C: {
    // Model C features
    in_0: false,  // Disable Model A
    in_1: false,  // Disable Model B
    in_2: true,   // Enable Model C

    // Disable Model A features
    in_11: false, // Show Buyside Pools
    in_12: false, // Show Sellside Pools
    in_16: false, // Show Sweep Labels
    in_18: false, // Show Bullish FVGs
    in_19: false, // Show Bearish FVGs
    in_21: false, // Show FVG Labels
    in_22: false, // Show Inverted FVGs

    // Disable Model B features
    in_24: false, // Show Fibonacci Levels
    in_25: false, // Show Fibonacci Labels
    in_28: false, // Highlight OTE Zone

    // FVG (Model C)
    in_7: true,   // Show HTF FVG Boxes
    in_8: true,   // Show LTF FVG Boxes
    in_9: true,   // Show Model C Signal Arrows

    // General signals
    in_31: false, // Show Buy/Sell Signal Arrows (Model C has its own)
  },

  ALL: {
    // Enable everything
    in_0: true,
    in_1: true,
    in_2: true,
    in_7: true,
    in_8: true,
    in_9: true,
    in_11: true,
    in_12: true,
    in_16: true,
    in_18: true,
    in_19: true,
    in_21: true,
    in_22: true,
    in_24: true,
    in_25: true,
    in_28: true,
    in_31: true,
  }
};

async function setModel(model) {
  const config = MODEL_CONFIGS[model];
  if (!config) {
    console.error(`Unknown model: ${model}. Use A, B, C, or ALL.`);
    process.exit(1);
  }

  const targets = await CDP.List({host:'127.0.0.1', port:9222});
  const page = targets.find(t => t.type==='page' && /tradingview\.com\/chart/i.test(t.url));
  if (!page) {
    console.error('TradingView chart page not found. Is TV Desktop running with --remote-debugging-port=9222?');
    process.exit(1);
  }

  const client = await CDP({host:'127.0.0.1', port:9222, target:page.id});
  await client.Runtime.enable();

  const r = await client.Runtime.evaluate({
    expression: `
      (() => {
        const cwc = window._exposed_chartWidgetCollection;
        const chart = cwc.activeChartWidget.value();
        const model = chart._modelWV.value().m_model;
        const sources = model._panes[0].m_dataSources;
        const atif = sources['3'];
        const props = atif._properties;

        if (!props || !props.inputs) {
          return {error: 'No inputs found on indicator'};
        }

        const before = {};
        const after = {};

        // Capture before state for relevant inputs
        for (const [k, v] of Object.entries(props.inputs)) {
          try {
            if (v && typeof v === 'object' && v._value !== undefined) {
              before[k] = v._value;
            }
          } catch(e) {}
        }

        // Apply config
        const config = ${JSON.stringify(config)};
        for (const [inputId, value] of Object.entries(config)) {
          if (props.inputs[inputId] && typeof props.inputs[inputId].setValue === 'function') {
            props.inputs[inputId].setValue(value);
          }
        }

        // Capture after state
        for (const [k, v] of Object.entries(props.inputs)) {
          try {
            if (v && typeof v === 'object' && v._value !== undefined) {
              after[k] = v._value;
            }
          } catch(e) {}
        }

        return {
          model: '${model}',
          changed: Object.keys(config).filter(k => before[k] !== after[k]),
          before: Object.fromEntries(Object.keys(config).map(k => [k, before[k]])),
          after: Object.fromEntries(Object.keys(config).map(k => [k, after[k]]))
        };
      })()
    `,
    returnByValue: true
  });

  console.log(JSON.stringify(r.result.value, null, 2));
  await client.close();
}

const model = process.argv[2] || 'C';
setModel(model).catch(e => {
  console.error(e);
  process.exit(1);
});
