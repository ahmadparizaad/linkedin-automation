# Vercel Deployment Guide

## Prerequisites

1. Install Vercel CLI globally:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

## Environment Variables Setup

Before deploying, you need to set up environment variables in Vercel. You have two options:

### Option 1: Using Vercel CLI (Recommended)
```bash
# Set each environment variable
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET  
vercel env add GOOGLE_REFRESH_TOKEN
vercel env add GOOGLE_SPREADSHEET_ID
vercel env add TAVILY_API_KEY
vercel env add OPENROUTER_API_KEY
vercel env add LINKEDIN_CLIENT_ID
vercel env add LINKEDIN_CLIENT_SECRET
vercel env add LINKEDIN_ACCESS_TOKEN
vercel env add LINKEDIN_PERSON_ID
vercel env add SCHEDULE_CRON
```

### Option 2: Using Vercel Dashboard
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to "Environment Variables" section
4. Add all the variables from your .env file

## Deployment Commands

### First-time Deployment
```bash
# Navigate to your project directory
cd d:\Projects\linkedin-automation

# Deploy to Vercel (this will prompt for project setup)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name: linkedin-automation
# - Directory: ./
```

### Subsequent Deployments
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Important Notes for Vercel Deployment

1. **Cron Jobs**: Vercel serverless functions don't support traditional cron jobs. You'll need to:
   - Use Vercel Cron (paid feature) 
   - Or use an external service like GitHub Actions
   - Or trigger manually via API

2. **OAuth Redirects**: Update your redirect URIs in:
   - Google Cloud Console: `https://your-app.vercel.app/api/auth/google/callback`
   - LinkedIn Developer Portal: `https://your-app.vercel.app/api/auth/linkedin/callback`

3. **Base URL**: Update your BASE_URL environment variable to your Vercel domain

## Quick Deployment Script

Save this as `deploy.sh` (or `deploy.bat` on Windows):

```bash
#!/bin/bash
echo "Deploying LinkedIn Automation to Vercel..."

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy
echo "Starting deployment..."
vercel --prod

echo "Deployment complete!"
echo "Don't forget to update OAuth redirect URIs with your new domain!"
```

## Post-Deployment Checklist

- [ ] Update OAuth redirect URIs in Google and LinkedIn consoles
- [ ] Test OAuth flows with new domain
- [ ] Update BASE_URL environment variable
- [ ] Test automation workflow
- [ ] Set up cron alternative (if needed)
