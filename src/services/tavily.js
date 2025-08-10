const axios = require('axios');
const { logger } = require('../utils/logger');

class TavilyService {
  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
    this.baseUrl = 'https://api.tavily.com';
    
    if (!this.apiKey) {
      throw new Error('TAVILY_API_KEY is required');
    }
  }

  async searchWeb(topic) {
    try {
      logger.info(`Searching web for topic: ${topic}`);
      
      const searchPayload = {
        query: `Search on web for ${topic}`,
        auto_parameters: false,
        topic: "general",
        search_depth: "basic",
        chunks_per_source: 3,
        max_results: 3,
        time_range: null,
        days: 7,
        include_answer: true,
        include_raw_content: true,
        include_images: false,
        include_image_descriptions: false,
        include_favicon: false,
        include_domains: [],
        exclude_domains: [],
        country: null
      };

      const response = await axios.post(`${this.baseUrl}/search`, searchPayload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.results) {
        logger.info(`Found ${response.data.results.length} articles for topic: ${topic}`);
        return response.data;
      } else {
        throw new Error('No results found in Tavily response');
      }
    } catch (error) {
      logger.error('Error searching web with Tavily:', error.response?.data || error.message);
      throw new Error(`Tavily search failed: ${error.response?.data?.message || error.message}`);
    }
  }

  formatArticlesForAI(searchResults) {
    try {
      if (!searchResults.results || searchResults.results.length === 0) {
        throw new Error('No articles found in search results');
      }

      // Ensure we have at least 3 articles, pad with empty content if needed
      const articles = [];
      for (let i = 0; i < 3; i++) {
        const result = searchResults.results[i];
        if (result) {
          articles.push({
            title: result.title || '',
            content: result.content || '',
            url: result.url || ''
          });
        } else {
          // Pad with empty article if we don't have enough results
          articles.push({
            title: 'No additional article found',
            content: 'No additional content available',
            url: ''
          });
        }
      }

      const formattedText = 
        `Article 1: ${articles[0].content}\n` +
        `Article 2: ${articles[1].content}\n` +
        `Article 3: ${articles[2].content}`;

      logger.info('Articles formatted for AI processing');
      return {
        formattedText,
        articles,
        totalResults: searchResults.results.length
      };
    } catch (error) {
      logger.error('Error formatting articles for AI:', error);
      throw error;
    }
  }
}

module.exports = new TavilyService();
