# Railway Deployment Instructions for OilProTanks

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with your GitHub account
3. Verify your account

## Step 2: Deploy from GitHub
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose "OilBro/OilProTanks" repository
4. Railway will automatically detect it's a Node.js app

## Step 3: Configure Environment Variables
In Railway dashboard, go to Variables tab and add:

```
NODE_ENV=production
PORT=${{RAILWAY_PORT}}
MANUS_API_KEY=sk-zDm_shrMAjHfl6SUz-xLYUmj3Szz8pMuT3RwdAe32lHM2gIAqZOPosd09QbPPcU9fN9aw3xWXUtZ_rc
JWT_SECRET=oilpro-super-secure-jwt-secret-2025
VITE_AI_ANALYSIS_UI=true
VITE_MAINTENANCE_UTILS_UI=true
CLIENT_URL=${{RAILWAY_PUBLIC_DOMAIN}}
VITE_API_BASE_URL=${{RAILWAY_PUBLIC_DOMAIN}}
```

## Step 4: Deploy Settings
Railway should automatically:
- Build Command: `npm run build`
- Start Command: `npm start`
- Port: Auto-detected from $PORT

## Step 5: Monitor Deployment
1. Watch the deployment logs in Railway dashboard
2. Once deployed, visit your Railway URL
3. Test the health endpoint: `https://your-app.railway.app/api/health`

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure build script works: `npm run build`

### App Crashes on Start
- Check environment variables are set correctly
- Verify the start command in logs
- Check that PORT is using Railway's $PORT variable

### API Not Working
- Ensure MANUS_API_KEY is set correctly
- Check CORS settings for your Railway domain
- Verify all environment variables are configured

## Expected Result
Your app will be available at: `https://oilpro-tanks-production.railway.app` (or similar)

## Support
If deployment fails, check the Railway logs and ensure all environment variables are set correctly.