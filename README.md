# OilProTanks - API 653 Tank Inspection Management System

A comprehensive tank inspection management system for API 653 compliance, featuring automated report generation, thickness measurement tracking, and AI-powered document analysis.

## Features

- **Tank Inspection Management**: Complete workflow for API 653 tank inspections
- **Report Generation**: Automated PDF report generation with custom templates
- **Thickness Measurements**: Track and analyze shell thickness data
- **AI Document Analysis**: Intelligent parsing of inspection documents and spreadsheets
- **Database Integration**: PostgreSQL with Drizzle ORM for reliable data storage
- **Modern UI**: React-based interface with responsive design

## Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React 18, Vite, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Components**: Radix UI, Tailwind CSS
- **AI Integration**: OpenRouter API for document analysis
- **File Processing**: PDF parsing, image analysis, Excel handling

## Local Development

### Prerequisites

- Node.js 20+ 
- PostgreSQL database
- npm or yarn package manager

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OilBro/OilProTanks.git
   cd OilProTanks
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your local configuration:
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - Configure `JWT_SECRET` with a secure random string
   - Set `CLIENT_URL` to `http://localhost:5173` for development

4. **Setup database:**
   ```bash
   npm run db:push
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/api/health

## Deployment on Render

This application is configured for easy deployment on [Render](https://render.com) using the included `render.yaml` configuration file.

### Step-by-Step Deployment Guide

#### 1. Prepare Your GitHub Repository

Ensure your code is pushed to a GitHub repository that Render can access.

#### 2. Connect Render to GitHub

1. **Sign up/Login to Render:**
   - Go to [render.com](https://render.com)
   - Sign up for a new account or log in with your existing account
   - Connect your GitHub account when prompted

2. **Authorize GitHub Access:**
   - Grant Render permission to access your repositories
   - You can choose to give access to all repositories or select specific ones

#### 3. Deploy Using Blueprint (Recommended)

1. **Create New Service from Blueprint:**
   - In your Render dashboard, click "New +"
   - Select "Blueprint"
   - Connect your GitHub repository containing the OilProTanks code

2. **Configure Blueprint:**
   - Render will automatically detect the `render.yaml` file
   - Review the services that will be created:
     - **Web Service**: `oilprotanks-web` (Node.js application)
     - **PostgreSQL Database**: `oilprotanks-postgres`

3. **Set Required Environment Variables:**
   Before deploying, add these environment variables in the Render dashboard:

   **Required Variables:**
   - `JWT_SECRET`: A secure random string (generate using `openssl rand -base64 32`)
   
   **Optional Variables (for full functionality):**
   - `OPENROUTER_API_KEY`: For AI document analysis features
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: For cloud storage features

   **How to add environment variables:**
   - Go to your web service dashboard
   - Click on "Environment" tab
   - Add each variable with its value
   - Click "Save Changes"

4. **Deploy:**
   - Click "Apply" to start the deployment
   - Render will:
     - Create the PostgreSQL database
     - Build your application (`npm ci && npm run build`)
     - Start the web service (`npm run start`)

#### 4. Alternative: Manual Service Creation

If you prefer manual setup instead of using the blueprint:

1. **Create PostgreSQL Database:**
   - Click "New +" → "PostgreSQL"
   - Name: `oilprotanks-postgres`
   - Choose your plan (Free tier available)
   - Note the connection details

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `oilprotanks-web`
     - **Runtime**: Node
     - **Build Command**: `npm ci && npm run build`
     - **Start Command**: `npm run start`
     - **Plan**: Starter (can upgrade later)

3. **Configure Environment Variables:**
   Add the following in the Environment tab:
   ```
   NODE_ENV=production
   DATABASE_URL=[Auto-filled by connecting to PostgreSQL service]
   CLIENT_URL=[Your Render service URL]
   JWT_SECRET=[Your secure secret]
   ```

#### 5. Database Setup

After deployment, the database will be automatically created. The application includes:
- Automatic database schema migration on startup
- Seed data for testing (in development mode)
- Health checks to ensure database connectivity

#### 6. Verify Deployment

1. **Check Service Status:**
   - Your web service should show "Live" status
   - Database should show "Available" status

2. **Test the Application:**
   - Visit your Render service URL
   - Check the health endpoint: `https://your-app.onrender.com/`
   - Verify database connectivity through the application

3. **Monitor Logs:**
   - Use Render's log viewer to monitor application startup
   - Check for any errors during deployment

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | Auto-set by Render |
| `PORT` | Yes | Server port | Auto-set by Render |
| `CLIENT_URL` | Yes | Frontend URL for CORS | Auto-set by Render |
| `JWT_SECRET` | Yes | Secret for JWT tokens | `your-secure-secret-key` |
| `OPENROUTER_API_KEY` | No | AI analysis features | `sk-or-...` |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | No | Cloud storage features | `{"type":"service_account"...}` |

### Database Configuration

The application uses PostgreSQL with Drizzle ORM:

- **Database Provider**: PostgreSQL 15+
- **ORM**: Drizzle ORM with migrations
- **Connection**: Configured via `DATABASE_URL` environment variable
- **Schema**: Automatically applied on application startup
- **Migrations**: Located in `/migrations` directory

### Scaling and Production Considerations

1. **Service Plans:**
   - Start with Starter plan for both web service and database
   - Upgrade to Standard/Pro plans as usage grows

2. **Database Scaling:**
   - Monitor database usage in Render dashboard
   - Consider upgrading database plan for larger datasets

3. **Environment Security:**
   - Use strong, unique values for `JWT_SECRET`
   - Regularly rotate API keys
   - Monitor access logs

4. **Performance Monitoring:**
   - Use Render's built-in metrics
   - Monitor response times and error rates
   - Set up alerts for service health

### Troubleshooting

**Common Issues:**

1. **Build Failures:**
   - Check build logs for dependency issues
   - Ensure Node.js version compatibility (20+)
   - Verify all required dependencies are in `package.json`

2. **Database Connection Issues:**
   - Verify `DATABASE_URL` is correctly configured
   - Check database service status
   - Review connection logs

3. **Environment Variable Issues:**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify secret values are properly encoded

4. **Health Check Failures:**
   - Application provides health check at `/` endpoint
   - Monitor startup logs for initialization errors
   - Check database connectivity

**Getting Help:**
- Review Render documentation: [render.com/docs](https://render.com/docs)
- Check application logs in Render dashboard
- Monitor health check endpoint for application status

## API Documentation

The application provides OpenAPI documentation. After deployment, you can access:
- API endpoints at: `https://your-app.onrender.com/api/`
- Health check: `https://your-app.onrender.com/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.