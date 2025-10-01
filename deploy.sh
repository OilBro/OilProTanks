#!/bin/bash

# OilProTanks Deployment Script
# This script helps deploy to various hosting platforms

echo "🚀 OilProTanks Deployment Helper"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building application..."
npm run build

echo "✅ Build complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. For Railway: Push to GitHub, then connect your repo at railway.app"
echo "2. For Render: Push to GitHub, then connect your repo at render.com"
echo "3. For Vercel: Run 'npx vercel' after installing Vercel CLI"
echo ""
echo "📝 Don't forget to set these environment variables on your hosting platform:"
echo "- NODE_ENV=production"
echo "- MANUS_API_KEY=sk-zDm_shrMAjHfl6SUz-xLYUmj3Szz8pMuT3RwdAe32lHM2gIAqZOPosd09QbPPcU9fN9aw3xWXUtZ_rc"
echo "- JWT_SECRET=(generate a secure random string)"
echo "- CLIENT_URL=(your deployed app URL)"
echo "- VITE_API_BASE_URL=(same as CLIENT_URL)"