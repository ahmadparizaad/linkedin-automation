# LinkedIn Automation Server

An automated LinkedIn content creation and posting system that researches topics, generates AI-powered posts, and publishes them to LinkedIn.

## Features

- **Automated Scheduling**: Runs daily at 7 AM (configurable)
- **Google Sheets Integration**: Manages topics and content status
- **Web Research**: Uses Tavily API to find recent, relevant articles
- **AI Content Generation**: Creates human-like LinkedIn posts using OpenRouter AI
- **LinkedIn Publishing**: Automatically posts generated content
- **Status Tracking**: Monitors workflow progress and health

## Workflow Process

1. **Schedule Trigger**: Activates daily at configured time
2. **Fetch Topics**: Retrieves "To Do" items from Google Sheets
3. **Web Research**: Searches for 3 recent articles on the topic using Tavily
4. **Content Generation**: AI synthesizes articles into engaging LinkedIn post
5. **Update Status**: Marks item as "Created" in spreadsheet
6. **LinkedIn Post**: Publishes content with public visibility

## Prerequisites

- Node.js 18+ 
- Google Sheets API access
- Tavily API key
- OpenRouter API key  
- LinkedIn API access token

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd linkedin-automation
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env` file (see `.env` file for all required variables)

4. **Setup OAuth Authentication** (Required):
   - Visit `http://localhost:3000/api/auth/setup` for instructions
   - Setup Google OAuth: `GET /api/auth/google/authorize`
   - Setup LinkedIn OAuth: `GET /api/auth/linkedin/authorize`
   - See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed instructions

5. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Environment Variables

### Required Configuration

- `GOOGLE_CLIENT_ID`: Google OAuth2 client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth2 client secret  
- `GOOGLE_REFRESH_TOKEN`: Google OAuth2 refresh token
- `GOOGLE_SPREADSHEET_ID`: ID of your Google Sheets document
- `TAVILY_API_KEY`: Tavily web search API key
- `OPENROUTER_API_KEY`: OpenRouter AI API key
- `LINKEDIN_ACCESS_TOKEN`: LinkedIn API access token
- `LINKEDIN_PERSON_ID`: LinkedIn person/profile ID

### Optional Configuration

- `PORT`: Server port (default: 3000)
- `SCHEDULE_CRON`: Cron expression for automation schedule (default: daily 7 AM)
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## API Endpoints

### Authentication & Setup
- `GET /api/auth/status` - Check OAuth configuration status
- `GET /api/auth/setup` - Get setup instructions
- `GET /api/auth/google/authorize` - Setup Google OAuth
- `GET /api/auth/linkedin/authorize` - Setup LinkedIn OAuth
- `POST /api/auth/validate-all` - Validate all OAuth tokens

### Automation Control
- `POST /api/trigger-automation` - Manually trigger the automation workflow
- `GET /api/status` - Get current automation status and statistics
- `GET /api/test-connections` - Test all service connections
- `GET /api/health` - Server health check

### System
- `GET /` - Health check and basic server information

### GET /api/test-connections
Test all service connections (Google Sheets, Tavily, OpenRouter, LinkedIn)

### Google OAuth Endpoints

#### GET /api/google/auth-status
Check Google OAuth configuration status and validate refresh token

#### GET /api/google/auth
Initiate Google OAuth flow - returns authorization URL

#### GET /auth/google/callback
OAuth callback endpoint (used by Google, don't call directly)

#### GET /api/google/test-access
Test Google Sheets access with current credentials

## Google Sheets Setup

### Option 1: Automatic OAuth Setup
1. Start the server: `npm start`
2. Check OAuth status: `GET http://localhost:3000/api/google/auth-status`
3. If refresh token is missing, initiate OAuth: `GET http://localhost:3000/api/google/auth`
4. Visit the returned authorization URL in your browser
5. Grant permissions to your Google account
6. You'll be redirected back to the application with success confirmation
7. The refresh token will be automatically saved to your `.env` file

### Option 2: Manual Setup
Your spreadsheet should have the following columns:
- **Topic**: The subject to research and create content about
- **Status**: Current status ("To Do" or "Created")  
- **Content**: Generated LinkedIn post content (filled automatically)

### Required Google Permissions
The application requires access to:
- Google Sheets API (to read/write spreadsheet data)
- Google Drive API (to access spreadsheet files)

## Scheduled Automation

The system automatically runs daily at 7 AM (configurable via `SCHEDULE_CRON`). You can also trigger it manually via the API endpoint.

## Logging

The application logs all activities with configurable log levels. Logs include:
- Workflow execution details
- API interactions
- Error handling
- Performance metrics

## Error Handling

- Graceful error handling for all API integrations
- Automatic retry logic for transient failures
- Detailed error logging for debugging
- Continues processing other items if one fails

## Security

- Environment variable configuration
- Helmet.js security headers
- CORS protection
- Input validation and sanitization

## Monitoring

The system provides:
- Real-time status monitoring
- Execution history
- Performance metrics  
- Connection health checks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
