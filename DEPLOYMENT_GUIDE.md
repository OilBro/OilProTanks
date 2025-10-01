# 🚀 OilProTanks Deployment Guide

Your app is ready to deploy on multiple platforms! Here's how to escape Replit and get your app running reliably.

## 📋 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. **Setup**:
   - Go to [railway.app](https://railway.app)
   - Sign up with your GitHub account
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your OilProTanks repository

2. **Environment Variables**:
   Add these in Railway dashboard → Variables:
   ```
   NODE_ENV=production
   MANUS_API_KEY=sk-zDm_shrMAjHfl6SUz-xLYUmj3Szz8pMuT3RwdAe32lHM2gIAqZOPosd09QbPPcU9fN9aw3xWXUtZ_rc
   JWT_SECRET=your-super-secure-random-string
   VITE_AI_ANALYSIS_UI=true
   VITE_MAINTENANCE_UTILS_UI=true
   ```

3. **Deploy**: Railway auto-deploys from your main branch!

### Option 2: Render (Great Free Option)

1. **Setup**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub account
   - Click "New" → "Web Service"
   - Connect your OilProTanks repository

2. **Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Add the same environment variables as above

### Option 3: Vercel (Fast & Reliable)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Environment Variables**:
   Add them in Vercel dashboard or via CLI:
   ```bash
   vercel env add MANUS_API_KEY
   ```

## 🔧 Local Development (After Download)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.production .env
   # Edit .env with your values
   ```

3. **Run Locally**:
   ```bash
   npm run dev
   ```

## ✅ What's Already Configured

- ✅ **Build System**: Optimized for production
- ✅ **Health Checks**: `/api/health` endpoint ready
- ✅ **Manus AI**: Pre-configured with working API key
- ✅ **Docker**: Production-ready Dockerfile included
- ✅ **All Import Fixes**: TypeScript issues resolved
- ✅ **Environment Loading**: Proper dotenv configuration

## 🎯 Recommended: Railway Deployment

Railway is the best alternative to Replit because:
- ✅ Reliable deployments (no random failures)
- ✅ Free tier with generous limits
- ✅ Auto-deploys from GitHub
- ✅ Built-in environment variable management
- ✅ No arbitrary restrictions
- ✅ Better performance than Replit

## 🚨 Important Notes

1. **Environment Variables**: Make sure to add `MANUS_API_KEY` to your hosting platform's environment variables
2. **Domain Updates**: Update `CLIENT_URL` and `VITE_API_BASE_URL` to match your new domain
3. **Database**: Currently using in-memory storage (fine for testing, can upgrade to PostgreSQL later)

## 🆘 If You Need Help

1. Download your Replit as a ZIP
2. Extract it to your computer
3. Push it to a new GitHub repository
4. Follow the Railway deployment steps above

Your app will be running reliably in minutes! No more Replit sabotage! 🎉