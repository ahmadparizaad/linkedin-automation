@echo off
echo LinkedIn Automation - Vercel Deployment Script
echo ================================================

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
)

echo.
echo Starting deployment to Vercel...
echo.

REM Deploy to production
vercel --prod

echo.
echo ================================================
echo Deployment complete!
echo.
echo IMPORTANT: Don't forget to:
echo 1. Update OAuth redirect URIs with your new Vercel domain
echo 2. Update BASE_URL environment variable in Vercel dashboard
echo 3. Test the OAuth flows
echo ================================================
pause
