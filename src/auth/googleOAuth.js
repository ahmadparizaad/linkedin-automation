const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class GoogleOAuthService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = `${this.getBaseUrl()}/api/auth/google/callback`;
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ];
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }
  }

  getBaseUrl() {
    return process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  }

  createOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  generateAuthUrl() {
    const oauth2Client = this.createOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent'
    });

    logger.info('Generated Google OAuth URL');
    return authUrl;
  }

  async exchangeCodeForTokens(code) {
    try {
      const oauth2Client = this.createOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      
      logger.info('Successfully exchanged code for Google tokens');
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  async validateRefreshToken(refreshToken) {
    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Try to get a new access token using the refresh token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        logger.info('Google refresh token is valid');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Google refresh token validation failed:', error);
      return false;
    }
  }

  async saveRefreshTokenToEnv(refreshToken) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = await fs.readFile(envPath, 'utf8');
      
      // Update or add the GOOGLE_REFRESH_TOKEN
      const tokenLine = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;
      
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        // Replace existing token
        envContent = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          tokenLine
        );
      } else {
        // Add new token line
        envContent += `\n${tokenLine}`;
      }
      
      await fs.writeFile(envPath, envContent);
      
      // Update process.env
      process.env.GOOGLE_REFRESH_TOKEN = refreshToken;
      
      logger.info('Google refresh token saved to .env file');
      return true;
    } catch (error) {
      logger.error('Error saving refresh token to .env:', error);
      throw error;
    }
  }

  async getAuthStatus() {
    const hasCredentials = !!(this.clientId && this.clientSecret);
    const hasRefreshToken = !!process.env.GOOGLE_REFRESH_TOKEN;
    let isValidToken = false;

    if (hasRefreshToken) {
      isValidToken = await this.validateRefreshToken(process.env.GOOGLE_REFRESH_TOKEN);
    }

    return {
      hasCredentials,
      hasRefreshToken,
      isValidToken,
      needsAuth: !isValidToken,
      authUrl: !isValidToken ? this.generateAuthUrl() : null
    };
  }
}

module.exports = new GoogleOAuthService();
