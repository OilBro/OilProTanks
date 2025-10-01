#!/bin/bash

# Multi-platform deployment script
# Detects platform and runs appropriate commands

echo "🚀 Detecting deployment platform..."

# Check for Railway
if [ ! -z "$RAILWAY_ENVIRONMENT" ]; then
    echo "📡 Railway detected"
    export NODE_ENV=production
    export PORT=${PORT:-3000}
    npm run build
    node dist/index.js
    exit 0
fi

# Check for Render
if [ ! -z "$RENDER" ]; then
    echo "🎨 Render detected"
    export NODE_ENV=production
    export PORT=${PORT:-10000}
    npm run build
    node dist/index.js
    exit 0
fi

# Check for Vercel
if [ ! -z "$VERCEL" ]; then
    echo "▲ Vercel detected"
    export NODE_ENV=production
    npm run build
    exit 0
fi

# Check for Netlify
if [ ! -z "$NETLIFY" ]; then
    echo "🌐 Netlify detected"
    export NODE_ENV=production
    npm run build
    exit 0
fi

# Default local development
echo "💻 Local environment detected"
export NODE_ENV=development
export PORT=${PORT:-5000}
npm run dev