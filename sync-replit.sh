#!/bin/bash
# OilProTanks Replit Sync Script
# Run this in your Replit shell to sync OptanKit integration

echo "🚀 Syncing OilProTanks with OptanKit Integration..."

# Step 1: Clean up any git issues
echo "📂 Cleaning git state..."
git rebase --abort 2>/dev/null || true
rm -rf .git/rebase-apply .git/rebase-merge .git/MERGE_HEAD .git/MERGE_MSG 2>/dev/null || true

# Step 2: Force sync with remote
echo "🔄 Syncing with GitHub..."
git fetch origin
git reset --hard origin/main
git clean -fd

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 4: Kill port conflicts
echo "🔌 Clearing port conflicts..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Step 5: Start server
echo "🚀 Starting OilProTanks with OptanKit..."
echo "Server will start on port 5001 if port 5000 is busy"
PORT=5001 npm run dev &

echo "✅ Done! Your app should now have:"
echo "   - Enhanced Calculations tab in navigation"
echo "   - Velocity Analysis Calculator (API RP 14E)"
echo "   - Tank Capacity Calculator with export"
echo "   - Professional engineering dashboard"
echo ""
echo "🌐 Access at: http://localhost:5001 (or your Replit URL)"
echo "🎯 Click 'Enhanced Calculations' to see OptanKit features"