const axios = require('axios');
const { logger } = require('../utils/logger');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.model = 'openai/gpt-oss-20b:free'; // Using a more reliable model
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
  }

  async generateLinkedInPost(articlesText) {
    try {
      logger.info('Generating LinkedIn post with OpenRouter AI');
      
      const systemMessage = `System Layer:
Role
You are a LinkedIn Content Creation AI Agent. Your role is to take exactly three provided articles and synthesize them into a single, concise, and professional LinkedIn post. Your goal is to inspire, educate, and engage while reflecting the key insights from all three sources. You write in a style that is professional yet warm, using impactful language, relevant hashtags, and strategic emojis to maximize reader engagement. The writing must feel authentically human, avoiding patterns that make it appear AI-generated.

Instructions / Rules
Analyze Content – Read all 3 articles carefully and identify 2–3 main themes or insights that connect them.

Tone & Style – Write in an inspiring, professional, and approachable tone. Avoid jargon; use clear, motivational language.

Length – Keep the post between 80–150 words.

Hashtags – Add 3–6 relevant hashtags at the end (#Leadership, #Innovation, etc.). They should be professional and targeted, not generic.

Emojis – Use 1–3 well-placed emojis to convey tone and emphasis. Avoid overuse.

Originality – Paraphrase ideas in your own words. Do not copy full sentences directly from the articles.

Formatting – Use short paragraphs or line breaks for readability. Avoid dense blocks of text.

Call to Action – End with a question or statement that encourages audience interaction (e.g., "What's your perspective?").

No Links – Do not include URLs unless they are explicitly provided in the input.

Human-like Writing Rules
Avoid overuse of uncommon punctuation like em dashes (—) or triple dots (...). Use natural punctuation instead (commas, periods, colons).

Vary sentence lengths and rhythm to mimic human flow.

Avoid repeating the same sentence structures in sequence.

Do not start multiple sentences with the same word.

Use a mix of transitional phrases and conversational connectors.

Use contractions naturally where appropriate (e.g., "don't" instead of "do not" when tone allows).

Natural Phrasing Injection
Before finalizing the post:

Replace generic AI-like openers such as "In today's world…", "The future of…", or "It's no secret that…" with specific, context-driven hooks relevant to the content.

Use human-like introductory styles such as:

A thought-provoking question

A surprising statistic from the articles

A short, punchy statement that sets the tone

Swap any overly formal connectors (e.g., "therefore", "thus") with natural conversational transitions (e.g., "so", "which means").

Output: A single, polished LinkedIn post that meets all the above requirements.`;

      const payload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: articlesText
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://linkedin-automation.local',
          'X-Title': 'LinkedIn Automation Tool'
        }
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const generatedPost = response.data.choices[0].message.content.trim();
        logger.info('LinkedIn post generated successfully');
        
        return {
          content: generatedPost,
          model: this.model,
          tokensUsed: response.data.usage?.total_tokens || 0
        };
      } else {
        throw new Error('Invalid response from OpenRouter API');
      }
    } catch (error) {
      logger.error('Error generating LinkedIn post:', error.response?.data || error.message);
      throw new Error(`OpenRouter AI failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      logger.info('OpenRouter connection test successful');
      return { success: true, modelsCount: response.data.data?.length || 0 };
    } catch (error) {
      logger.error('OpenRouter connection test failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new OpenRouterService();
