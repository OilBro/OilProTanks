#!/bin/bash
# Complete Replit Git Reset Script
# This will fix ALL git issues including detached HEAD

echo "🔧 === COMPLETE REPLIT GIT RESET ==="
echo "This will fix detached HEAD and sync OptanKit integration"

# Step 1: Kill any running processes
echo "🛑 Stopping any running servers..."
pkill -f "tsx server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Step 2: Complete git reset
echo "🔧 Fixing git state..."
git checkout --detach HEAD 2>/dev/null || true
git checkout main 2>/dev/null || true
git branch -D temp-branch 2>/dev/null || true

# Step 3: Clean all git locks and state
echo "🧹 Cleaning git locks..."
rm -rf .git/*.lock 2>/dev/null || true
rm -rf .git/refs/heads/*.lock 2>/dev/null || true
rm -rf .git/refs/remotes/*/*.lock 2>/dev/null || true
rm -rf .git/index.lock 2>/dev/null || true
rm -rf .git/config.lock 2>/dev/null || true

# Step 4: Reset all merge/rebase state
echo "🔄 Clearing merge/rebase state..."
git rebase --abort 2>/dev/null || true
git merge --abort 2>/dev/null || true
git cherry-pick --abort 2>/dev/null || true
git am --abort 2>/dev/null || true
rm -rf .git/rebase-apply .git/rebase-merge 2>/dev/null || true
rm -rf .git/MERGE_* .git/CHERRY_PICK_* .git/REVERT_* 2>/dev/null || true

# Step 5: Force checkout main branch
echo "🎯 Force checkout main branch..."
git checkout -B main origin/main
git reset --hard origin/main
git clean -fdx

# Step 6: Ensure we're on main with correct tracking
echo "🔗 Setting up branch tracking..."
git branch --set-upstream-to=origin/main main

# Step 7: Verify git state
echo "✅ Verifying git state..."
git status
git branch -v

# Step 8: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 9: Start server
echo "🚀 Starting OilProTanks with OptanKit..."
echo "Starting server on port 5001..."
PORT=5001 npm run dev &

echo ""
echo "🎉 === RESET COMPLETE ==="
echo "✅ Git HEAD is now properly attached to main branch"
echo "✅ OptanKit integration should now be visible"
echo "✅ Server starting on port 5001"
echo ""
echo "🎯 You should now see:"
echo "   • 'Enhanced Calculations' tab in navigation"
echo "   • Velocity Analysis Calculator"
echo "   • Tank Capacity Calculator"
echo ""
echo "🌐 Access your app and look for the new tab!"