const express = require('express');
const googleOAuth = require('../auth/googleOAuth');
const linkedinOAuth = require('../auth/linkedinOAuth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get all OAuth statuses
router.get('/status', async (req, res) => {
  try {
    const [googleStatus, linkedinStatus] = await Promise.all([
      googleOAuth.getAuthStatus(),
      linkedinOAuth.getAuthStatus()
    ]);

    const allConfigured = googleStatus.isValidToken && linkedinStatus.isValidToken;

    res.json({
      success: true,
      allConfigured,
      services: {
        google: googleStatus,
        linkedin: linkedinStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting OAuth status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OAuth status',
      error: error.message
    });
  }
});

// Get setup instructions
router.get('/setup', async (req, res) => {
  try {
    const [googleStatus, linkedinStatus] = await Promise.all([
      googleOAuth.getAuthStatus(),
      linkedinOAuth.getAuthStatus()
    ]);

    const instructions = {
      google: {
        configured: googleStatus.isValidToken,
        steps: googleStatus.needsAuth ? [
          '1. Visit: GET /api/auth/google/authorize',
          '2. Follow the authorization URL',
          '3. Complete OAuth flow',
          '4. Refresh token will be saved automatically'
        ] : ['✅ Google OAuth is already configured']
      },
      linkedin: {
        configured: linkedinStatus.isValidToken,
        steps: linkedinStatus.needsAuth ? [
          '1. Visit: GET /api/auth/linkedin/authorize',
          '2. Follow the authorization URL',
          '3. Complete OAuth flow',
          '4. Access token will be saved automatically'
        ] : ['✅ LinkedIn OAuth is already configured']
      }
    };

    res.json({
      success: true,
      allConfigured: googleStatus.isValidToken && linkedinStatus.isValidToken,
      instructions,
      quickLinks: {
        googleAuth: '/api/auth/google/authorize',
        linkedinAuth: '/api/auth/linkedin/authorize',
        checkStatus: '/api/auth/status'
      }
    });
  } catch (error) {
    logger.error('Error getting OAuth setup instructions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OAuth setup instructions',
      error: error.message
    });
  }
});

// Validate all OAuth tokens
router.post('/validate-all', async (req, res) => {
  try {
    const [googleValid, linkedinValid] = await Promise.all([
      googleOAuth.validateRefreshToken(process.env.GOOGLE_REFRESH_TOKEN),
      linkedinOAuth.validateAccessToken(process.env.LINKEDIN_ACCESS_TOKEN)
    ]);

    const results = {
      google: {
        hasToken: !!process.env.GOOGLE_REFRESH_TOKEN,
        isValid: googleValid,
        authUrl: !googleValid ? googleOAuth.generateAuthUrl() : null
      },
      linkedin: {
        hasToken: !!process.env.LINKEDIN_ACCESS_TOKEN,
        isValid: linkedinValid.valid || false,
        profile: linkedinValid.profile || null,
        authUrl: !linkedinValid.valid ? linkedinOAuth.generateAuthUrl() : null
      }
    };

    const allValid = results.google.isValid && results.linkedin.isValid;

    res.json({
      success: true,
      allValid,
      message: allValid ? 'All OAuth tokens are valid' : 'Some OAuth tokens need renewal',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error validating OAuth tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate OAuth tokens',
      error: error.message
    });
  }
});

module.exports = router;
