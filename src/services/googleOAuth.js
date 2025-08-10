const { google } = require('googleapis');
const { logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class GoogleOAuthService {
  constructor() {
    this.oauth2Client = null;
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Google OAuth credentials are missing from environment variables');
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        this.getRedirectUri()
      );

      logger.info('Google OAuth service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google OAuth service:', error);
      throw error;
    }
  }

  getRedirectUri() {
    const port = process.env.PORT || 3000;
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.BASE_URL || `http://localhost:${port}`
      : `http://localhost:${port}`;
    return `${baseUrl}/auth/google/callback`;
  }

  generateAuthUrl() {
    try {
      logger.info('Generating Google OAuth authorization URL');
      
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
        prompt: 'consent' // Force consent screen to get refresh token
      });

      return authUrl;
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      throw error;
    }
  }

  async exchangeCodeForTokens(code) {
    try {
      logger.info('Exchanging authorization code for tokens');
      
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received. Please revoke access and try again.');
      }

      logger.info('Successfully received tokens from Google');
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  async validateRefreshToken(refreshToken = null) {
    try {
      const tokenToValidate = refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
      
      if (!tokenToValidate || tokenToValidate === 'your_google_refresh_token') {
        return {
          valid: false,
          reason: 'No refresh token configured'
        };
      }

      // Set credentials and try to refresh
      this.oauth2Client.setCredentials({
        refresh_token: tokenToValidate
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      logger.info('Refresh token validation successful');
      return {
        valid: true,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      };
    } catch (error) {
      logger.error('Refresh token validation failed:', error);
      return {
        valid: false,
        reason: error.message
      };
    }
  }

  async saveRefreshTokenToEnv(refreshToken) {
    try {
      logger.info('Saving refresh token to .env file');
      
      const envPath = path.join(process.cwd(), '.env');
      let envContent = await fs.readFile(envPath, 'utf8');
      
      // Replace the refresh token line
      const refreshTokenRegex = /GOOGLE_REFRESH_TOKEN=.*/;
      if (refreshTokenRegex.test(envContent)) {
        envContent = envContent.replace(refreshTokenRegex, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
      } else {
        // Add the refresh token if it doesn't exist
        envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}`;
      }
      
      await fs.writeFile(envPath, envContent);
      
      // Update the environment variable in memory
      process.env.GOOGLE_REFRESH_TOKEN = refreshToken;
      
      logger.info('Refresh token saved successfully');
      return true;
    } catch (error) {
      logger.error('Error saving refresh token to .env:', error);
      throw error;
    }
  }

  async testSheetsAccess() {
    try {
      logger.info('Testing Google Sheets access');
      
      if (!process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN === 'your_google_refresh_token') {
        throw new Error('No valid refresh token available');
      }

      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
      
      // Try to access the configured spreadsheet
      const response = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
      });

      logger.info('Google Sheets access test successful');
      return {
        success: true,
        spreadsheetTitle: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => sheet.properties.title)
      };
    } catch (error) {
      logger.error('Google Sheets access test failed:', error);
      throw error;
    }
  }

  getAuthStatus() {
    const hasClientCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const hasRefreshToken = !!(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN !== 'your_google_refresh_token');
    const hasSpreadsheetId = !!process.env.GOOGLE_SPREADSHEET_ID;

    return {
      hasClientCredentials,
      hasRefreshToken,
      hasSpreadsheetId,
      isFullyConfigured: hasClientCredentials && hasRefreshToken && hasSpreadsheetId,
      redirectUri: this.getRedirectUri()
    };
  }
}

module.exports = new GoogleOAuthService();
