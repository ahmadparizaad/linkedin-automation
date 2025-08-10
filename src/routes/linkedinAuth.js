const express = require('express');
const linkedinOAuth = require('../auth/linkedinOAuth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get LinkedIn OAuth status
router.get('/status', async (req, res) => {
  try {
    const status = await linkedinOAuth.getAuthStatus();
    res.json({
      success: true,
      service: 'linkedin',
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting LinkedIn OAuth status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get LinkedIn OAuth status',
      error: error.message
    });
  }
});

// Initiate LinkedIn OAuth flow
router.get('/authorize', async (req, res) => {
  try {
    const status = await linkedinOAuth.getAuthStatus();
    
    if (!status.needsAuth) {
      return res.json({
        success: true,
        message: 'LinkedIn OAuth already configured and valid',
        status
      });
    }

    const authData = linkedinOAuth.generateAuthUrl();
    
    res.json({
      success: true,
      message: 'LinkedIn OAuth authorization required',
      authUrl: authData.authUrl,
      scopes: authData.scopes,
      redirectUri: authData.redirectUri,
      instructions: 'Visit the authUrl to complete OAuth flow',
      note: 'If you get unauthorized_scope_error, your LinkedIn app may need additional permissions or access to Marketing Developer Platform'
    });
  } catch (error) {
    logger.error('Error initiating LinkedIn OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate LinkedIn OAuth',
      error: error.message
    });
  }
});

// Handle LinkedIn OAuth callback
router.get('/callback', async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    logger.error('LinkedIn OAuth callback error:', error);
    return res.status(400).send(`
      <html>
        <body>
          <h2>LinkedIn OAuth Error</h2>
          <p>Error: ${error}</p>
          <p><a href="/api/auth/linkedin/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html>
        <body>
          <h2>LinkedIn OAuth Error</h2>
          <p>No authorization code received</p>
          <p><a href="/api/auth/linkedin/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }

  try {
    logger.info('Processing LinkedIn OAuth callback');
    
    const tokens = await linkedinOAuth.exchangeCodeForTokens(code);
    
    if (tokens.access_token) {
      // Get user profile to extract person ID
      const validation = await linkedinOAuth.validateAccessToken(tokens.access_token);
      const personId = validation.profile?.id;
      
      await linkedinOAuth.saveAccessTokenToEnv(tokens.access_token, personId);
      
      res.send(`
        <html>
          <body>
            <h2>LinkedIn OAuth Success!</h2>
            <p>✅ LinkedIn access has been configured successfully.</p>
            <p>✅ Access token saved to environment variables.</p>
            ${personId ? `<p>✅ Person ID: ${personId}</p>` : ''}
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
      throw new Error('No access token received from LinkedIn');
    }
  } catch (error) {
    logger.error('Error processing LinkedIn OAuth callback:', error);
    res.status(500).send(`
      <html>
        <body>
          <h2>LinkedIn OAuth Error</h2>
          <p>Failed to process authorization: ${error.message}</p>
          <p><a href="/api/auth/linkedin/authorize">Try again</a></p>
        </body>
      </html>
    `);
  }
});

// Validate current LinkedIn token
router.post('/validate', async (req, res) => {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!accessToken) {
      return res.json({
        success: false,
        message: 'No LinkedIn access token found',
        needsAuth: true,
        authUrl: linkedinOAuth.generateAuthUrl()
      });
    }

    const validation = await linkedinOAuth.validateAccessToken(accessToken);
    
    res.json({
      success: true,
      isValid: validation.valid,
      profile: validation.profile,
      message: validation.valid ? 'LinkedIn token is valid' : 'LinkedIn token is invalid',
      needsAuth: !validation.valid,
      authUrl: !validation.valid ? linkedinOAuth.generateAuthUrl() : null
    });
  } catch (error) {
    logger.error('Error validating LinkedIn token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate LinkedIn token',
      error: error.message
    });
  }
});

// Check if token needs refresh (LinkedIn tokens expire after 60 days)
router.post('/refresh', async (req, res) => {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!accessToken) {
      return res.json({
        success: false,
        message: 'No LinkedIn access token found',
        needsAuth: true,
        authUrl: linkedinOAuth.generateAuthUrl().authUrl
      });
    }

    const refreshResult = await linkedinOAuth.refreshTokenIfNeeded(accessToken);
    
    if (refreshResult.expired) {
      res.json({
        success: false,
        message: 'LinkedIn token expired, re-authorization required',
        expired: true,
        authUrl: refreshResult.authUrl
      });
    } else {
      res.json({
        success: true,
        message: 'LinkedIn token is still valid',
        expired: false
      });
    }
  } catch (error) {
    logger.error('Error checking LinkedIn token refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check LinkedIn token status',
      error: error.message
    });
  }
});

// Diagnostic endpoint for LinkedIn OAuth troubleshooting
router.get('/diagnostic', async (req, res) => {
  try {
    const authData = linkedinOAuth.generateAuthUrl();
    
    const diagnostic = {
      configuration: {
        clientId: process.env.LINKEDIN_CLIENT_ID ? '✅ Set' : '❌ Missing',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN ? '✅ Set' : '❌ Missing',
        personId: process.env.LINKEDIN_PERSON_ID ? '✅ Set' : '❌ Missing'
      },
      oauthSettings: {
        scopes: authData.scopes,
        redirectUri: authData.redirectUri,
        authUrl: authData.authUrl
      },
      troubleshooting: {
        commonIssues: [
          'unauthorized_scope_error: Your LinkedIn app doesn\'t have the required permissions',
          'invalid_redirect_uri: The redirect URI doesn\'t match your LinkedIn app settings',
          'Marketing Developer Platform access may be required for w_member_social scope'
        ],
        solutions: [
          '1. Check your LinkedIn app permissions at https://www.linkedin.com/developers/apps',
          '2. Ensure redirect URI matches exactly: ' + authData.redirectUri,
          '3. For posting capabilities, apply for Marketing Developer Platform access',
          '4. Start with basic scopes (r_emailaddress, r_liteprofile) first'
        ]
      }
    };

    res.json({
      success: true,
      diagnostic,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error running LinkedIn diagnostic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run diagnostic',
      error: error.message
    });
  }
});

// Test with basic scopes only (profile access)
router.get('/authorize-basic', async (req, res) => {
  try {
    // Switch to basic scopes
    linkedinOAuth.useBasicScopes();
    
    const authData = linkedinOAuth.generateAuthUrl();
    
    res.json({
      success: true,
      message: 'LinkedIn OAuth with basic scopes (profile access only)',
      authUrl: authData.authUrl,
      scopes: authData.scopes,
      redirectUri: authData.redirectUri,
      note: 'This uses minimal scopes that should work with most LinkedIn apps',
      instructions: 'Visit the authUrl to complete OAuth flow with basic permissions'
    });
  } catch (error) {
    logger.error('Error initiating basic LinkedIn OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate basic LinkedIn OAuth',
      error: error.message
    });
  }
});

// Test with full scopes (profile + posting)
router.get('/authorize-full', async (req, res) => {
  try {
    // Switch to full scopes
    linkedinOAuth.useFullScopes();
    
    const authData = linkedinOAuth.generateAuthUrl();
    
    res.json({
      success: true,
      message: 'LinkedIn OAuth with full scopes (profile + posting)',
      authUrl: authData.authUrl,
      scopes: authData.scopes,
      redirectUri: authData.redirectUri,
      warning: 'This requires Marketing Developer Platform access for posting',
      instructions: 'Visit the authUrl to complete OAuth flow with full permissions'
    });
  } catch (error) {
    logger.error('Error initiating full LinkedIn OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate full LinkedIn OAuth',
      error: error.message
    });
  }
});

module.exports = router;
