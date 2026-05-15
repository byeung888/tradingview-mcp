#!/usr/bin/env python3
"""
TradingView Webhook -> WhatsApp Server
Production-ready for Render deployment.

Receives alerts from TradingView webhooks and forwards them to WhatsApp
via the free CallMeBot API.

Environment variables required:
  WHATSAPP_NUMBER   - Your WhatsApp number with country code (e.g. 85291234567)
  CALLMEBOT_API_KEY - Your CallMeBot API key

To get a CallMeBot API key:
  1. Save +34 644 52 53 02 to your contacts as 'CallMeBot'
  2. WhatsApp message: "I allow callmebot to send me messages"
  3. They reply with your API key

TradingView alert message format:
  {"action":"OTE","symbol":"{{ticker}}","price":"{{close}}","message":"Price entered OTE zone"}
"""

import os
import sys
from datetime import datetime
from flask import Flask, request, jsonify
import requests

# ══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════════════

WHATSAPP_NUMBER = os.environ.get("WHATSAPP_NUMBER", "")
CALLMEBOT_API_KEY = os.environ.get("CALLMEBOT_API_KEY", "")
PORT = int(os.environ.get("PORT", "5000"))

if not WHATSAPP_NUMBER or not CALLMEBOT_API_KEY:
    print("ERROR: Set WHATSAPP_NUMBER and CALLMEBOT_API_KEY environment variables")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# SERVER
# ══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
alert_log = []


def send_whatsapp(message: str) -> dict:
    """Send a message via CallMeBot WhatsApp API."""
    url = "https://api.callmebot.com/whatsapp.php"
    params = {
        "phone": WHATSAPP_NUMBER,
        "text": message,
        "apikey": CALLMEBOT_API_KEY,
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        return {"status": resp.status_code, "response": resp.text}
    except Exception as e:
        return {"status": -1, "error": str(e)}


def format_alert(data: dict) -> str:
    """Format a TradingView alert into a readable WhatsApp message."""
    symbol = data.get("symbol", "UNKNOWN")
    price = data.get("price", "N/A")
    message = data.get("message", "No message")
    action = data.get("action", "ALERT")
    timestamp = datetime.now().strftime("%H:%M:%S")

    emoji_map = {
        "BUY": "🟢",
        "SELL": "🔴",
        "LONG": "🟢",
        "SHORT": "🔴",
        "OTE": "🟡",
        "FVG": "🟣",
        "SWEEP": "🔵",
        "ALERT": "⚠️",
    }
    emoji = emoji_map.get(action.upper(), "⚠️")

    return (
        f"{emoji} *Atif Signal — {action.upper()}*\n"
        f"━━━━━━━━━━━━━━\n"
        f"📊 Symbol: {symbol}\n"
        f"💰 Price: {price}\n"
        f"⏰ Time: {timestamp}\n"
        f"📝 {message}\n"
        f"━━━━━━━━━━━━━━"
    )


@app.route("/webhook", methods=["POST"])
def webhook():
    """Receive TradingView webhook alerts."""
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception:
        data = {"message": request.data.decode("utf-8", errors="ignore")}

    alert_entry = {
        "time": datetime.now().isoformat(),
        "payload": data,
    }
    alert_log.append(alert_entry)
    if len(alert_log) > 100:
        alert_log.pop(0)

    msg = format_alert(data)
    result = send_whatsapp(msg)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] ALERT: {data}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] WhatsApp: {result}")

    return jsonify({"ok": True, "whatsapp": result}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "alerts_received": len(alert_log)}), 200


@app.route("/logs", methods=["GET"])
def logs():
    return jsonify(alert_log[-20:]), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
