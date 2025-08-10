const { google } = require('googleapis');
const { logger } = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Google OAuth credentials are missing from environment variables');
      }

      if (!process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN === 'your_google_refresh_token') {
        logger.warn('Google refresh token not configured. Use /api/google/auth-status to check OAuth setup.');
        return; // Don't initialize if no refresh token
      }

      // Create OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      // Set credentials
      this.auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      // Create sheets instance
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      logger.info('Google Sheets service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  async getToDoItems() {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not properly initialized. Please configure OAuth first.');
      }

      logger.info('Fetching To Do items from Google Sheets');
      
      // Get all data from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:C', // Assuming columns A=Topic, B=Status, C=Content
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        logger.warn('No data found in spreadsheet');
        return null;
      }

      // Find header row and data rows
      const headers = rows[0];
      const topicIndex = headers.findIndex(h => h.toLowerCase().includes('topic'));
      const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));
      const contentIndex = headers.findIndex(h => h.toLowerCase().includes('content'));

      if (topicIndex === -1 || statusIndex === -1) {
        throw new Error('Required columns (Topic, Status) not found in spreadsheet');
      }

      // Find first "To Do" item
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[statusIndex] && row[statusIndex].toLowerCase().trim() === 'to do') {
          const item = {
            Topic: row[topicIndex] || '',
            Status: row[statusIndex] || '',
            Content: row[contentIndex] || '',
            rowIndex: i + 1, // 1-based index for Google Sheets
            range: `Sheet1!A${i + 1}:C${i + 1}`
          };
          
          logger.info(`Found To Do item: ${item.Topic}`);
          return item;
        }
      }

      logger.info('No To Do items found');
      return null;
    } catch (error) {
      logger.error('Error fetching To Do items:', error);
      throw error;
    }
  }

  async updateItemStatus(item, status, content = null) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not properly initialized. Please configure OAuth first.');
      }

      logger.info(`Updating item status to: ${status}`);
      
      const values = [
        [
          item.Topic,
          status,
          content || item.Content
        ]
      ];

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: item.range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      logger.info('Item status updated successfully');
      return response.data;
    } catch (error) {
      logger.error('Error updating item status:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      if (!this.sheets) {
        return { 
          error: 'Google Sheets not configured',
          total: 0, 
          toDo: 0, 
          created: 0,
          requiresOAuth: true
        };
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:C',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return { total: 0, toDo: 0, created: 0 };
      }

      const headers = rows[0];
      const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));
      
      let toDo = 0;
      let created = 0;
      
      for (let i = 1; i < rows.length; i++) {
        const status = rows[i][statusIndex]?.toLowerCase().trim();
        if (status === 'to do') toDo++;
        else if (status === 'created') created++;
      }

      return {
        total: rows.length - 1,
        toDo,
        created,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting spreadsheet status:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
