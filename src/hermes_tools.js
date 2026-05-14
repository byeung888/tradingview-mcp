#!/usr/bin/env node
/**
 * Hermes Agent CLI for TradingView Desktop control.
 *
 * Usage: node hermes_tools.js <command> [args...]
 *
 * Commands:
 *   sources                              List all data sources on the active chart
 *   symbol                               Get current chart symbol
 *   resolution                           Get current chart resolution
 *   bars <sourceId> [groupId]            Get OHLCV bars from a source (default group 0)
 *   data <sourceId>                      Get raw data items from a source
 *   alerts <sourceId>                    Get alerts from a source
 *   pine <sourceId>                      Get Pine script metadata from a source
 *   set-symbol <symbol>                  Change chart symbol
 *   set-resolution <resolution>          Change chart resolution (e.g. 1D, 4h, 1h)
 *   screenshot <outfile>                 Capture chart screenshot to PNG file
 */

import {
  getSources,
  getSymbol,
  getResolution,
  getBars,
  getSourceData,
  getAlerts,
  getPineSourceCode,
  changeSymbol,
  changeResolution,
  takeScreenshot,
  disconnect,
} from './tv_desktop.js';

import fs from 'fs';

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(`Usage: node hermes_tools.js <command> [args...]

Commands:
  sources                              List all data sources
  symbol                               Get current symbol
  resolution                           Get current resolution
  bars <sourceId> [groupId]            Get OHLCV bars (default group 0)
  data <sourceId>                      Get raw data items
  alerts <sourceId>                    Get alerts
  pine <sourceId>                      Get Pine script metadata
  set-symbol <symbol>                  Change chart symbol
  set-resolution <resolution>          Change resolution (1D, 4h, 1h, etc.)
  screenshot <outfile.png>             Capture screenshot`);
    process.exit(0);
  }

  try {
    let result;
    switch (cmd) {
      case 'sources':
        result = await getSources();
        break;
      case 'symbol':
        result = await getSymbol();
        break;
      case 'resolution':
        result = await getResolution();
        break;
      case 'bars': {
        const sourceId = process.argv[3];
        const groupId = process.argv[4] || '0';
        if (!sourceId) throw new Error('Usage: bars <sourceId> [groupId]');
        result = await getBars(sourceId, groupId);
        break;
      }
      case 'data': {
        const sourceId = process.argv[3];
        if (!sourceId) throw new Error('Usage: data <sourceId>');
        result = await getSourceData(sourceId);
        break;
      }
      case 'alerts': {
        const sourceId = process.argv[3];
        if (!sourceId) throw new Error('Usage: alerts <sourceId>');
        result = await getAlerts(sourceId);
        break;
      }
      case 'pine': {
        const sourceId = process.argv[3];
        if (!sourceId) throw new Error('Usage: pine <sourceId>');
        result = await getPineSourceCode(sourceId);
        break;
      }
      case 'set-symbol': {
        const symbol = process.argv[3];
        if (!symbol) throw new Error('Usage: set-symbol <symbol>');
        result = await changeSymbol(symbol);
        break;
      }
      case 'set-resolution': {
        const resolution = process.argv[3];
        if (!resolution) throw new Error('Usage: set-resolution <resolution>');
        result = await changeResolution(resolution);
        break;
      }
      case 'screenshot': {
        const outfile = process.argv[3];
        if (!outfile) throw new Error('Usage: screenshot <outfile.png>');
        const data = await takeScreenshot();
        fs.writeFileSync(outfile, Buffer.from(data, 'base64'));
        result = { saved: outfile, sizeBytes: fs.statSync(outfile).size };
        break;
      }
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await disconnect();
  }
}

main();
