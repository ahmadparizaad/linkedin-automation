const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * Enhanced LinkedIn OAuth Service based on functional implementation
 */
class LinkedInOAuthService {
  constructor() {
    // Use environment variables with fallback to hardcoded values
    this.clientId = process.env.LINKEDIN_CLIENT_ID || '77jp9mc355j1dz';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || 'WPL_AP1.xAWE09KHhrQOMGOF.kKHmug==';
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${this.getBaseUrl()}/api/auth/linkedin/callback`;
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    this.apiUrl = 'https://api.linkedin.com/v2';
    this.oauthUrl = 'https://www.linkedin.com/oauth/v2';

    // Updated scopes to match your LinkedIn app configuration
    this.basicScopes = ['openid', 'profile', 'email'];
    this.fullScopes = ['openid', 'profile', 'email', 'w_member_social'];
    this.scopes = this.fullScopes; // Use full scopes since you have them enabled

    // Log configuration (but hide secret)
    logger.info('LinkedIn OAuth Service initialized with:', {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      hasSecret: !!this.clientSecret,
      scopes: this.scopes
    });
  }

  getBaseUrl() {
    return process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  }

  // Method to switch between basic and full scopes
  useBasicScopes() {
    this.scopes = this.basicScopes;
    logger.info('Switched to basic LinkedIn scopes (profile access only)');
  }

  useFullScopes() {
    this.scopes = this.fullScopes;
    logger.info('Switched to full LinkedIn scopes (profile + posting)');
  }

  /**
   * Generate authorization URL for LinkedIn OAuth flow
   * 
   * @param {Array} scopes - Array of scopes to request (optional)
   * @param {String} state - State parameter for CSRF protection (optional)
   * @returns {Object} - Authorization details including URL
   */
  generateAuthUrl(scopes = null, state = null) {
    if (!this.redirectUri) {
      throw new Error('Redirect URI is not configured');
    }

    const requestedScopes = scopes || this.scopes;
    const stateParam = state || Math.random().toString(36).substring(7); // Simple state for CSRF protection
    
    const scopeParam = requestedScopes.join(' ');
    const authUrl = new URL(`${this.oauthUrl}/authorization`);
    
    logger.info('Generating authorization URL with params:', {
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scopes: scopeParam,
      state: stateParam
    });

    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('scope', scopeParam);
    authUrl.searchParams.append('state', stateParam);
    
    return {
      authUrl: authUrl.toString(),
      state: stateParam,
      scopes: requestedScopes,
      redirectUri: this.redirectUri
    };
  }

  /**
   * Exchange authorization code for access token
   * 
   * @param {String} code - Authorization code
   * @returns {Promise<Object>} - Token details
   */
  async exchangeCodeForTokens(code) {
    try {
      logger.info('Attempting to exchange authorization code for access token');
      logger.info(`Using redirect URI: ${this.redirectUri}`);
      
      if (!this.clientId || !this.clientSecret) {
        throw new Error('LinkedIn client credentials are not configured');
      }

      const params = {
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      };

      logger.info('Making token exchange request with params:', { ...params, client_secret: '[REDACTED]' });

      const response = await axios.post(
        `${this.oauthUrl}/accessToken`,
        null,
        {
          params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('Successfully exchanged code for access token');
      return response.data;
    } catch (error) {
      logger.error(`Error exchanging code for token: ${error.message}`);
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        logger.error('Response headers:', error.response.headers);
      } else if (error.request) {
        logger.error('No response received from LinkedIn');
        logger.error('Request details:', error.request);
      }
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param {String} refreshToken - Refresh token
   * @returns {Promise<Object>} - New token details
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(
        `${this.oauthUrl}/accessToken`,
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: this.clientId,
            client_secret: this.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('Successfully refreshed access token');
      return response.data;
    } catch (error) {
      logger.error(`Error refreshing token: ${error.message}`);
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  async validateAccessToken(accessToken) {
    try {
      // Use the correct LinkedIn API endpoint for the new scopes
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        logger.info('LinkedIn access token is valid');
        return {
          valid: true,
          profile: {
            id: response.data.sub, // 'sub' is the user ID in OpenID Connect
            firstName: response.data.given_name,
            lastName: response.data.family_name,
            email: response.data.email,
            name: response.data.name
          }
        };
      }
      return { valid: false };
    } catch (error) {
      logger.error('LinkedIn access token validation failed:', error.response?.data || error.message);
      return { valid: false };
    }
  }

  async saveAccessTokenToEnv(accessToken, personId = null) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = await fs.readFile(envPath, 'utf8');
      
      // Update or add the LINKEDIN_ACCESS_TOKEN
      const tokenLine = `LINKEDIN_ACCESS_TOKEN=${accessToken}`;
      
      if (envContent.includes('LINKEDIN_ACCESS_TOKEN=')) {
        // Replace existing token
        envContent = envContent.replace(
          /LINKEDIN_ACCESS_TOKEN=.*/,
          tokenLine
        );
      } else {
        // Add new token line
        envContent += `\n${tokenLine}`;
      }

      // Update person ID if provided
      if (personId) {
        const personIdLine = `LINKEDIN_PERSON_ID=${personId}`;
        if (envContent.includes('LINKEDIN_PERSON_ID=')) {
          envContent = envContent.replace(
            /LINKEDIN_PERSON_ID=.*/,
            personIdLine
          );
        } else {
          envContent += `\n${personIdLine}`;
        }
      }
      
      await fs.writeFile(envPath, envContent);
      
      // Update process.env
      process.env.LINKEDIN_ACCESS_TOKEN = accessToken;
      if (personId) {
        process.env.LINKEDIN_PERSON_ID = personId;
      }
      
      logger.info('LinkedIn access token saved to .env file');
      return true;
    } catch (error) {
      logger.error('Error saving access token to .env:', error);
      throw error;
    }
  }

  async getAuthStatus() {
    const hasCredentials = !!(this.clientId && this.clientSecret);
    const hasAccessToken = !!process.env.LINKEDIN_ACCESS_TOKEN;
    let isValidToken = false;
    let profile = null;

    if (hasAccessToken) {
      const validation = await this.validateAccessToken(process.env.LINKEDIN_ACCESS_TOKEN);
      isValidToken = validation.valid;
      profile = validation.profile;
    }

    const authData = this.generateAuthUrl();

    return {
      hasCredentials,
      hasAccessToken,
      isValidToken,
      needsAuth: !isValidToken,
      authUrl: !isValidToken ? authData.authUrl : null,
      scopes: authData.scopes,
      redirectUri: authData.redirectUri,
      profile
    };
  }

  async refreshTokenIfNeeded(accessToken) {
    // LinkedIn access tokens don't have a traditional refresh mechanism
    // They expire after 60 days and need to be re-authorized
    const validation = await this.validateAccessToken(accessToken);
    
    if (!validation.valid) {
      logger.warn('LinkedIn access token expired, re-authorization needed');
      return {
        expired: true,
        authUrl: this.generateAuthUrl().authUrl
      };
    }

    return { expired: false };
  }

  /**
   * Generate authorization URL with specific scopes
   * Alternative method name for compatibility
   */
  generateAuthorizationUrl(scopes = ['openid', 'profile', 'email', 'w_member_social'], state = '') {
    return this.generateAuthUrl(scopes, state);
  }

  /**
   * Exchange authorization code for access token
   * Alternative method name for compatibility
   */
  async exchangeAuthCodeForAccessToken(code) {
    return this.exchangeCodeForTokens(code);
  }
}

module.exports = new LinkedInOAuthService();
