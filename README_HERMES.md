# TradingView Desktop Control — Hermes Agent Setup

## What was done

Adapted the `tradingview-mcp` project to work with **TradingView Desktop v3.1.0** on macOS via Chrome DevTools Protocol (CDP).

### New files
- `src/tv_desktop.js` — CDP connection + TV Desktop 3.1.0 API helpers
- `src/hermes_tools.js` — CLI tool for Hermes Agent

### Updated paths for TV Desktop 3.1.0
- Chart widget: `window._exposed_chartWidgetCollection.activeChartWidget.value()`
- Model: `chart._modelWV.value().m_model`
- Data sources: `model._panes[0].m_dataSources`
- Bar data: `sources[id]._graphicsPriceRangeGroups['0']._bars._items`

## How to use from Hermes

Make sure TradingView Desktop is running with CDP:
```bash
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222
```

Then call any command:
```bash
cd ~/Code/tradingview-mcp
node src/hermes_tools.js sources
node src/hermes_tools.js symbol
node src/hermes_tools.js resolution
node src/hermes_tools.js bars 3          # Get bars from source id 3 (Atif's indicator)
node src/hermes_tools.js data 3          # Get raw data from source id 3
node src/hermes_tools.js alerts 3        # Get alerts from source id 3
node src/hermes_tools.js pine 3          # Get Pine script metadata
node src/hermes_tools.js set-symbol COMEX:GC1!
node src/hermes_tools.js set-resolution 1D
node src/hermes_tools.js screenshot /tmp/chart.png
```

## Available commands

| Command | Args | Description |
|---------|------|-------------|
| `sources` | — | List all chart data sources with IDs |
| `symbol` | — | Get current chart symbol |
| `resolution` | — | Get current chart resolution |
| `bars` | `<sourceId>` `[groupId]` | Get OHLCV bars from a source (default group 0) |
| `data` | `<sourceId>` | Get raw data items from a source |
| `alerts` | `<sourceId>` | Get alerts from a source |
| `pine` | `<sourceId>` | Get Pine script metadata |
| `set-symbol` | `<symbol>` | Change chart symbol |
| `set-resolution` | `<resolution>` | Change resolution (1D, 4h, 1h, etc.) |
| `screenshot` | `<outfile.png>` | Capture chart screenshot |

## Bar data format

Each bar is `[time, open, high, low, close, volume]` where time is epoch seconds.

Example:
```json
[1772636400, 83.55, 84.835, 82.325, 83.505, 11211]
```

## Limitations

- Pine drawing primitives (lines, boxes, labels, tables) are empty in TV Desktop 3.1.0 — the data is stored in `_graphicsPriceRangeGroups` instead.
- Screenshot captures the entire page, not just the chart area.
- `set-symbol` and `set-resolution` work but may need a moment to load data.
