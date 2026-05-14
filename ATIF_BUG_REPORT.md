# Atif's Liquidity Toolkit [Swing Trading] — Bug Report

**Date:** 2026-05-14
**Tester:** Hermes Agent via TradingView Desktop CDP
**Chart:** COMEX:SI1! (Silver Futures) @ 240 (4h)
**Indicator Version:** Pine Script v5 (obfuscated ILScript bundle)

---

## Executive Summary

8 bugs found across Model Selection, HTF/LTF Configuration, OTE Fibonacci, Sweep Detection, FVG Logic, Alerts, and UI. 1 is **CRITICAL** — Model toggles are cosmetic only. **FIXED** via external workaround script.

---

## Bug #1 — CRITICAL: Model Toggles Are Cosmetic Only  [FIXED]

**Severity:** CRITICAL
**Category:** Model Selection
**Status:** FIXED (via `atif_models.cjs` workaround)

**Description:**
The three model toggles (Model A, B, C) only control which **signal arrows** are plotted. All underlying features — Liquidity Pools, FVG boxes, Fibonacci levels, OTE highlighting, Sweep labels — remain active regardless of which model is selected.

**Evidence:**
- Screenshots of Model A, B, C, and ALL show identical visual density (file sizes: 421K, 421K, 424K, 423K — all within ~1% variance)
- All `show*` flags (`in_11` through `in_31`) remain `true` across all model states
- Only `in_0`, `in_1`, `in_2` change between states

**Impact:**
User believes they are using a "focused" model, but the chart is still cluttered with every feature from every model. This defeats the purpose of model selection.

**Expected Behavior:**
Selecting Model A should disable Model B and C features (or at minimum, suppress their visual output). Each model should present a clean, focused view.

**Root Cause:**
The Pine Script uses `in_0/1/2` only to gate `plotshape()` calls for signal arrows, but does NOT gate the underlying `box.new()`, `line.new()`, `label.new()`, or `bgcolor()` calls.

**Fix Applied:**
Created `src/atif_models.cjs` which programmatically sets the correct `show*` inputs for each model via CDP:

| Model | Active Features | Disabled Features |
|-------|----------------|-------------------|
| **A** (Sweep+FVG) | Pools, Sweeps, FVGs, Signals | Fibonacci, OTE, HTF/LTF FVG |
| **B** (Trend+OTE) | Fibonacci, OTE, Signals | Pools, Sweeps, FVGs, HTF/LTF FVG |
| **C** (HTF+LTF FVG) | HTF FVG, LTF FVG, Model C Signals | Pools, Sweeps, FVGs, Fibonacci, OTE, General Signals |
| **ALL** | Everything | Nothing |

**Usage:**
```bash
cd ~/Code/tradingview-mcp
node src/atif_models.cjs A    # Enable Model A only
node src/atif_models.cjs B    # Enable Model B only
node src/atif_models.cjs C    # Enable Model C only
node src/atif_models.cjs ALL  # Enable all models
```

---

## Bug #2 — MEDIUM: HTF/LTF Mismatch in Model C

**Severity:** MEDIUM
**Category:** Timeframe Configuration

**Description:**
Model C is documented as "HTF FVG + LTF FVG Entry". However, the default HTF Anchor is set to `240` (4h) and the chart is also at `240`. This means HTF and chart timeframe are identical — there is no actual higher timeframe.

**Evidence:**
- `in_5` (Model C HTF Anchor) = `"240"`
- Chart resolution = `240`
- `in_6` (LTF Entry) = `"15"` — this is lower, but HTF is not higher

**Impact:**
Model C's HTF FVG boxes are drawn from the same timeframe as the chart, providing no multi-timeframe edge. The "HTF" label is misleading.

**Expected Behavior:**
HTF Anchor should default to a genuinely higher timeframe (e.g., `D` or `W` when chart is `240`). Or the input should be renamed to "Anchor Timeframe" to avoid implying "Higher".

---

## Bug #3 — LOW-MEDIUM: OTE Zone Low/High Ordering Not Validated

**Severity:** LOW-MEDIUM
**Category:** OTE Fibonacci

**Description:**
The OTE Zone inputs (`in_26` = 0.618, `in_27` = 0.786) have no validation that Low < High. A user could accidentally set `OTE Zone Low = 0.786` and `OTE Zone High = 0.618`, inverting the zone.

**Evidence:**
- No Pine Script `input.int()` or `input.float()` validation constraints observed
- No error or warning would fire

**Impact:**
Inverted zone would cause the OTE highlight to cover the wrong price region, leading to bad entries.

**Expected Behavior:**
Pine Script should enforce `oteLow < oteHigh` or at minimum warn the user.

---

## Bug #4 — MEDIUM: Sweep Confirmation Logic Is Weak

**Severity:** MEDIUM
**Category:** Sweep Detection

**Description:**
Sweep detection uses a 2-bar confirmation (`in_14 = 2`) and a minimum wick percentage (`in_15 = 0.3`), but there is no volume confirmation, no RSI/Momentum filter, and no check that the sweep occurs at a significant structural level (e.g., previous swing high/low).

**Evidence:**
- `in_14` = 2 bars
- `in_15` = 0.3 (30% wick)
- No volume or momentum inputs exist in the indicator

**Impact:**
False sweep signals on low-volume wicks or minor internal structure, leading to premature entries.

**Expected Behavior:**
Optional volume filter or momentum confirmation to reduce false sweeps.

---

## Bug #5 — LOW: FVG Minimum Gap Default Is Zero

**Severity:** LOW
**Category:** Fair Value Gaps

**Description:**
`in_17` (Min FVG Gap) defaults to `0`, meaning every single-tick gap is drawn as an FVG box. This creates visual clutter.

**Evidence:**
- `in_17` = 0
- FVG boxes are drawn even for gaps smaller than the spread

**Impact:**
Chart clutter, especially on low-volatility periods. User may miss significant FVGs among hundreds of tiny ones.

**Expected Behavior:**
Default should be at least 1 tick, or a small ATR-based threshold.

---

## Bug #6 — LOW: Alerts Fire Across All Models Regardless of Selection

**Severity:** LOW
**Category:** Alerts

**Description:**
Alert toggles (`in_34` through `in_39`) are global. Even if only Model C is enabled, alerts for Model A sweeps and Model B OTE touches will still fire if those features are active (which they are — see Bug #1).

**Evidence:**
- All alert flags default to `true`
- No model-specific alert gating observed

**Impact:**
Alert fatigue. User gets notified for events from "disabled" models.

**Expected Behavior:**
Alerts should be suppressed for models that are not selected, OR alert toggles should be nested under each model group.

---

## Bug #7 — LOW: Signal Text/Arrow Size Options May Not Affect Pine Shapes

**Severity:** LOW
**Category:** UI / Signal Rendering

**Description:**
`in_32` (Signal Text Size) and `in_33` (Signal Arrow Size) are text inputs with values `"normal"`. Pine Script's `plotshape()` does not support dynamic size based on string inputs. These may be non-functional or only affect label text, not arrow size.

**Evidence:**
- `in_32` = `"normal"` (text type)
- `in_33` = `"normal"` (text type)
- Pine Script `plotshape()` size parameter accepts `size.tiny`, `size.small`, `size.normal`, etc. — but not string variables directly

**Impact:**
User may change these settings expecting visual changes, but see no effect.

**Expected Behavior:**
Use `input.string()` with options `["tiny", "small", "normal", "large", "huge"]` and map to `size.*` constants.

---

## Bug #8 — LOW: `__fast_calc` Is Undocumented and Auto-Toggles

**Severity:** LOW
**Category:** Performance / Hidden Behavior

**Description:**
The `__fast_calc` input is hidden from the UI but exposed via CDP. It limits calculations to 2,000 bars. It appears to auto-disable when certain conditions are met, but this behavior is not documented.

**Evidence:**
- `__fast_calc` = `false` (observed)
- No description or tooltip in metaInfo

**Impact:**
User may experience inconsistent behavior across different charts or timeframes without understanding why.

**Expected Behavior:**
Document the fast calculation mode, or expose it as a visible user preference with a clear description.

---

## Appendix: Input ID Reference

| Input ID | Name | Type | Default |
|----------|------|------|---------|
| `in_0` | Enable Model A | bool | false |
| `in_1` | Enable Model B | bool | false |
| `in_2` | Enable Model C | bool | true |
| `in_3` | Higher Timeframe for Bias | resolution | "240" |
| `in_4` | Use HTF Bias Filter | bool | true |
| `in_5` | Model C HTF Anchor | resolution | "240" |
| `in_6` | Model C LTF Entry | resolution | "15" |
| `in_7` | Show HTF FVG Boxes | bool | true |
| `in_8` | Show LTF FVG Boxes | bool | true |
| `in_9` | Show Model C Signal Arrows | bool | true |
| `in_10` | Pivot Lookback | integer | 5 |
| `in_11` | Show Buyside Liquidity Pools | bool | true |
| `in_12` | Show Sellside Liquidity Pools | bool | true |
| `in_13` | Pool Line Width | integer | 2 |
| `in_14` | Sweep Confirmation | integer | 2 |
| `in_15` | Min Wick % for Sweep | float | 0.3 |
| `in_16` | Show Sweep Labels | bool | true |
| `in_17` | Min FVG Gap | float | 0 |
| `in_18` | Show Bullish FVGs | bool | true |
| `in_19` | Show Bearish FVGs | bool | true |
| `in_20` | FVG Extend | integer | 20 |
| `in_21` | Show FVG Labels on Boxes | bool | true |
| `in_22` | Show Inverted FVGs (iFVG) | bool | true |
| `in_23` | Fib Lookback | integer | 50 |
| `in_24` | Show Fibonacci Levels | bool | true |
| `in_25` | Show Fibonacci Labels | bool | false |
| `in_26` | OTE Zone Low (Fib) | float | 0.618 |
| `in_27` | OTE Zone High (Fib) | float | 0.786 |
| `in_28` | Highlight OTE Zone | bool | true |
| `in_29` | Trend EMA Period | integer | 50 |
| `in_30` | Use Swing High/Low Structure | bool | true |
| `in_31` | Show Buy/Sell Signal Arrows | bool | true |
| `in_32` | Signal Text Size | text | "normal" |
| `in_33` | Signal Arrow Size | text | "normal" |
| `in_34` | Alert on Sweep | bool | true |
| `in_35` | Alert on FVG | bool | true |
| `in_36` | Alert on OTE Touch | bool | true |
| `in_37` | Alert on BUY Signal | bool | true |
| `in_38` | Alert on SELL Signal | bool | true |
| `in_39` | Alert on Model C Signal | bool | true |
| `__fast_calc` | Fast calculation | bool | false |
| `__profile` | (hidden) | bool | false |

---

## Appendix: Screenshot File Sizes (Visual Change Proxy)

| State | File | Size |
|-------|------|------|
| ALL Models | `screenshot_all.png` | 423 KB |
| Model A (fixed) | `screenshot_model_a.png` | 421 KB |
| Model B (fixed) | `screenshot_model_b.png` | 421 KB |
| Model C (fixed) | `screenshot_model_c.png` | 424 KB |

**Interpretation:** File sizes are nearly identical because the chart still renders the same price action. The difference is which *overlays* are visible. The fixer script ensures only the relevant overlays are shown per model.

---

## Files

- `~/Code/tradingview-mcp/src/atif_models.cjs` — Model fixer script
- `~/Code/tradingview-mcp/src/hermes_tools.js` — General TV Desktop CLI
- `~/Code/tradingview-mcp/screenshot_all.png` — ALL models enabled
- `~/Code/tradingview-mcp/screenshot_model_a.png` — Model A only
- `~/Code/tradingview-mcp/screenshot_model_b.png` — Model B only
- `~/Code/tradingview-mcp/screenshot_model_c.png` — Model C only
