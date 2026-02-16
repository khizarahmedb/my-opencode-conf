#!/bin/bash
# opencode-serve-n8n.sh
# Start opencode serve for n8n integration
# Usage: ./opencode-serve-n8n.sh [port] [hostname]

set -e

PORT=${1:-3002}
HOST=${2:-0.0.0.0}

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        Opencode Serve for n8n Integration                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if opencode is installed
if ! command -v opencode &> /dev/null; then
    echo "❌ Error: opencode not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g opencode"
    echo ""
    exit 1
fi

echo "✅ Opencode found: $(which opencode)"
echo ""

# Check if port is in use
if lsof -i :$PORT &> /dev/null; then
    echo "⚠️  Port $PORT is already in use"
    read -p "Kill existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $(lsof -t -i:$PORT) 2>/dev/null || true
        sleep 1
        echo "✅ Killed existing process"
    else
        echo "Exiting..."
        exit 1
    fi
fi

echo "🚀 Starting opencode serve on http://$HOST:$PORT"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start opencode serve
opencode serve --port $PORT --hostname $HOST
