const googleSheets = require('./googleSheets');
const tavilyService = require('./tavily');
const openRouterService = require('./openRouter');
const linkedinService = require('./linkedin');
const { logger } = require('../utils/logger');

class LinkedInAutomationService {
  constructor() {
    this.isProcessing = false;
    this.lastRun = null;
    this.lastResult = null;
  }

  async processWorkflow() {
    if (this.isProcessing) {
      throw new Error('Workflow is already processing');
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting LinkedIn automation workflow');
      
      // Step 1: Get To Do item from Google Sheets
      const todoItem = await googleSheets.getToDoItems();
      if (!todoItem) {
        logger.info('No To Do items found, workflow completed');
        return {
          success: true,
          message: 'No To Do items found',
          timestamp: new Date().toISOString()
        };
      }

      logger.info(`Processing topic: ${todoItem.Topic}`);

      // Step 2: Search web for articles using Tavily
      const searchResults = await tavilyService.searchWeb(todoItem.Topic);
      const { formattedText, articles } = tavilyService.formatArticlesForAI(searchResults);

      // Step 3: Generate LinkedIn post using OpenRouter AI
      const aiResult = await openRouterService.generateLinkedInPost(formattedText);
      const generatedContent = aiResult.content;

      // Step 4: Update Google Sheets with generated content
      await googleSheets.updateItemStatus(todoItem, 'Created', generatedContent);

      // Step 5: Post to LinkedIn
      const linkedinResult = await linkedinService.postContent(generatedContent);

      const executionTime = Date.now() - startTime;
      const result = {
        success: true,
        topic: todoItem.Topic,
        articlesFound: articles.length,
        generatedContent,
        linkedinPostId: linkedinResult.postId,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString()
      };

      this.lastRun = new Date().toISOString();
      this.lastResult = result;

      logger.info(`Workflow completed successfully in ${executionTime}ms`);
      return result;

    } catch (error) {
      logger.error('Workflow failed:', error);
      this.lastResult = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async getStatus() {
    try {
      const sheetsStatus = await googleSheets.getStatus();
      
      return {
        isProcessing: this.isProcessing,
        lastRun: this.lastRun,
        lastResult: this.lastResult,
        spreadsheetStatus: sheetsStatus,
        serverUptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting automation status:', error);
      throw error;
    }
  }

  async testAllConnections() {
    const results = {
      googleSheets: false,
      tavily: false,
      openRouter: false,
      linkedin: false
    };

    try {
      // Test Google Sheets
      try {
        await googleSheets.getStatus();
        results.googleSheets = true;
        logger.info('Google Sheets connection: OK');
      } catch (error) {
        logger.error('Google Sheets connection: FAILED', error.message);
      }

      // Test Tavily
      try {
        await tavilyService.searchWeb('test');
        results.tavily = true;
        logger.info('Tavily connection: OK');
      } catch (error) {
        logger.error('Tavily connection: FAILED', error.message);
      }

      // Test OpenRouter
      try {
        await openRouterService.testConnection();
        results.openRouter = true;
        logger.info('OpenRouter connection: OK');
      } catch (error) {
        logger.error('OpenRouter connection: FAILED', error.message);
      }

      // Test LinkedIn
      try {
        await linkedinService.testConnection();
        results.linkedin = true;
        logger.info('LinkedIn connection: OK');
      } catch (error) {
        logger.error('LinkedIn connection: FAILED', error.message);
      }

      return results;
    } catch (error) {
      logger.error('Error testing connections:', error);
      throw error;
    }
  }
}

module.exports = new LinkedInAutomationService();
