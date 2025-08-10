const express = require('express');
const googleOAuth = require('../auth/googleOAuth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get Google OAuth status
router.get('/status', async (req, res) => {
  try {
    const status = await googleOAuth.getAuthStatus();
    res.json({
      success: true,
      service: 'google',
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting Google OAuth status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Google OAuth status',
      error: error.message
    });
  }
});

// Initiate Google OAuth flow
router.get('/authorize', async (req, res) => {
  try {
    const status = await googleOAuth.getAuthStatus();
    
    if (!status.needsAuth) {
      return res.json({
        success: true,
        message: 'Google OAuth already configured and valid',
        status
      });
    }

    const authUrl = googleOAuth.generateAuthUrl();
    
    res.json({
      success: true,
      message: 'Google OAuth authorization required',
      authUrl,
      instructions: 'Visit the authUrl to complete OAuth flow'
    });
  } catch (error) {
    logger.error('Error initiating Google OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Google OAuth',
      error: error.message
    });
  }
});

// Handle Google OAuth callback
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.error('Google OAuth callback error:', error);
    return res.status(400).send(`
      <html>
        <body>
          <h2>Google OAuth Error</h2>
          <p>Error: ${error}</p>
          <p><a href="/api/auth/google/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html>
        <body>
          <h2>Google OAuth Error</h2>
          <p>No authorization code received</p>
          <p><a href="/api/auth/google/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  try {
    logger.info('Processing Google OAuth callback');
    
    const tokens = await googleOAuth.exchangeCodeForTokens(code);
    
    if (tokens.refresh_token) {
      await googleOAuth.saveRefreshTokenToEnv(tokens.refresh_token);
      
      res.send(`
        <html>
          <body>
            <h2>Google OAuth Success!</h2>
            <p>✅ Google Sheets access has been configured successfully.</p>
            <p>✅ Refresh token saved to environment variables.</p>
            <p>You can now close this window and use the automation.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } else {
      throw new Error('No refresh token received from Google');
    }
  } catch (error) {
    logger.error('Error processing Google OAuth callback:', error);
    res.status(500).send(`
      <html>
        <body>
          <h2>Google OAuth Error</h2>
          <p>Failed to process authorization: ${error.message}</p>
          <p><a href="/api/auth/google/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }
});

// Validate current Google token
router.post('/validate', async (req, res) => {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    
    if (!refreshToken) {
      return res.json({
        success: false,
        message: 'No Google refresh token found',
        needsAuth: true,
        authUrl: googleOAuth.generateAuthUrl()
      });
    }

    const isValid = await googleOAuth.validateRefreshToken(refreshToken);
    
    res.json({
      success: true,
      isValid,
      message: isValid ? 'Google token is valid' : 'Google token is invalid',
      needsAuth: !isValid,
      authUrl: !isValid ? googleOAuth.generateAuthUrl() : null
    });
  } catch (error) {
    logger.error('Error validating Google token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate Google token',
      error: error.message
    });
  }
});

module.exports = router;
