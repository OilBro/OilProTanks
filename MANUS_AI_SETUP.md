# Manus AI Analyzer Setup Guide

This document explains how to configure and use the Manus AI analyzer for parsing Excel and PDF tank inspection files in the OilProTanks application.

## Overview

The OilProTanks application includes advanced AI-powered document analysis capabilities using Manus AI for parsing imported Excel and PDF files. The system gracefully falls back to standard parsing when AI services are not configured.

## Current Status ✅

- **Application**: Successfully running on port 5000
- **Excel Import**: Working ✅ (tested with template_test.xlsx)
- **PDF Import**: Working ✅ (tested with test-report.pdf)
- **Fallback Mechanism**: Working ✅ (gracefully handles missing API keys)
- **Database**: In-memory storage working correctly

## API Key Configuration

### 1. Manus AI Setup

1. Visit [https://manus.ai](https://manus.ai) to create an account
2. Generate an API key from your dashboard
3. Add the key to your `.env` file:
   ```bash
   MANUS_API_KEY=your_actual_manus_api_key_here
   ```

### 2. OpenRouter Backup (Optional)

For additional fallback options, you can also configure OpenRouter:

1. Visit [https://openrouter.ai](https://openrouter.ai) to create an account
2. Generate an API key
3. Add the key to your `.env` file:
   ```bash
   OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
   ```

### 3. Environment File (.env)

Your `.env` file should look like this:

```bash
# Environment variables for OilProTanks
NODE_ENV=development
CLIENT_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000

# Enable AI analysis UI indicators on import pages
VITE_AI_ANALYSIS_UI=true

# Enable maintenance/orphan cleanup utilities in UI
VITE_MAINTENANCE_UTILS_UI=true

# JWT secret for session management
JWT_SECRET=development-secret-change-in-production

# AI API Keys - Configure these to enable AI-powered document analysis
# Get Manus AI API key from: https://manus.ai
# Get OpenRouter API key from: https://openrouter.ai
MANUS_API_KEY=your_actual_manus_api_key_here
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here

# Database URL (using in-memory storage for development)
# DATABASE_URL=sqlite:./.data/reportarchitect.db
```

## Testing the Setup

### 1. Check Manus AI Status

Test if your API keys are configured correctly:

```bash
curl http://localhost:5000/api/test-manus
```

Expected responses:

**Without API keys:**
```json
{
  "manusConfigured": false,
  "openrouterConfigured": false,
  "message": "Manus AI is not configured, falling back to OpenRouter"
}
```

**With Manus AI configured:**
```json
{
  "manusConfigured": true,
  "openrouterConfigured": false,
  "message": "Manus AI is configured and will be used for document parsing"
}
```

### 2. Test File Import

Test Excel file import:
```bash
curl -X POST -F "excelFile=@template_test.xlsx" http://localhost:5000/api/reports/import
```

Test PDF file import:
```bash
curl -X POST -F "excelFile=@test-report.pdf" http://localhost:5000/api/reports/import
```

Both should return success responses with `"success": true`.

## AI Analysis Features

When properly configured, the Manus AI analyzer extracts:

### From Excel Files:
- Tank identification information
- Inspection details (dates, inspector, certification)
- Tank specifications (diameter, height, capacity)
- Thickness measurements with locations
- Inspection checklist items
- Recommendations and findings

### From PDF Files:
- Document text extraction
- Tank inspection data parsing
- Structural analysis of inspection reports
- Automated data validation

## Troubleshooting

### Common Issues:

1. **"Manus AI integration requires API key configuration"**
   - Add your MANUS_API_KEY to the .env file
   - Restart the server after adding the key

2. **Import works but no AI analysis**
   - Check server logs for AI analysis attempts
   - Verify API key is valid and has sufficient credits
   - System will fall back to standard parsing

3. **Database errors with .limit() function**
   - This was fixed by using storage interface instead of raw Drizzle ORM
   - Ensure you're using the latest code version

### Server Logs

Monitor server logs for AI analysis status:
```bash
# Look for these log entries:
# "=== MANUS AI ANALYSIS STARTING ==="
# "No AI analysis available, using standard parsing only..."
# "=== AI ANALYSIS FAILED OR LOW CONFIDENCE ==="
```

## Development Notes

- The application works without API keys (using fallback parsing)
- In-memory storage is used for development (no persistent database required)
- All import functionality has been tested and is working correctly
- The Manus AI analyzer includes proper error handling and graceful fallbacks

## Next Steps

1. Get your Manus AI API key from [https://manus.ai](https://manus.ai)
2. Add it to your `.env` file
3. Restart the server
4. Test with your actual tank inspection files
5. Monitor the enhanced extraction quality with AI enabled

For questions or issues, check the server logs and ensure your API keys are correctly configured.