const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
require('dotenv').config();

const linkedinAutomation = require('./src/services/linkedinAutomation');
const { logger } = require('./src/utils/logger');

// Import OAuth routes
const authRoutes = require('./src/routes/authRoutes');
const googleAuthRoutes = require('./src/routes/googleAuth');
const linkedinAuthRoutes = require('./src/routes/linkedinAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/auth/linkedin', linkedinAuthRoutes);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'LinkedIn Automation Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Setup page for OAuth configuration
app.get('/setup', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LinkedIn Automation Setup</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .container { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .endpoint { background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace; margin: 5px 0; }
        </style>
      </head>
      <body>
        <h1>LinkedIn Automation Setup</h1>
        
        <div class="container">
          <h2>Quick Setup Guide</h2>
          <ol>
            <li>Check current OAuth status</li>
            <li>If refresh token is missing, authorize with Google</li>
            <li>Test the connection</li>
            <li>Run your automation</li>
          </ol>
        </div>

        <div class="container">
          <h3>Useful Endpoints</h3>
          
          <h4>1. Check OAuth Status</h4>
          <div class="endpoint">GET <a href="/api/auth/google/status" target="_blank">/api/auth/google/status</a></div>
          <div class="endpoint">GET <a href="/api/auth/linkedin/status" target="_blank">/api/auth/linkedin/status</a></div>
          
          <h4>2. Start OAuth Flow (if needed)</h4>
          <div class="endpoint">GET <a href="/api/auth/google/authorize" target="_blank">/api/auth/google/authorize</a></div>
          <div class="endpoint">GET <a href="/api/auth/linkedin/authorize" target="_blank">/api/auth/linkedin/authorize</a></div>
          
          <h4>3. Test Connections</h4>
          <div class="endpoint">GET <a href="/api/test-connections" target="_blank">/api/test-connections</a></div>
          
          <h4>4. Check Automation Status</h4>
          <div class="endpoint">GET <a href="/api/status" target="_blank">/api/status</a></div>
          
          <h4>5. Trigger Manual Automation</h4>
          <div class="endpoint">POST /api/trigger-automation</div>
        </div>

        <div class="container">
          <h3>Environment Configuration</h3>
          <p>Make sure your <code>.env</code> file has the following configured:</p>
          <ul>
            <li>✅ <strong>GOOGLE_CLIENT_ID</strong> - Already configured</li>
            <li>✅ <strong>GOOGLE_CLIENT_SECRET</strong> - Already configured</li>
            <li>⚠️ <strong>GOOGLE_REFRESH_TOKEN</strong> - Will be set automatically via OAuth</li>
            <li>✅ <strong>GOOGLE_SPREADSHEET_ID</strong> - Already configured</li>
            <li>✅ <strong>TAVILY_API_KEY</strong> - Already configured</li>
            <li>⚠️ <strong>OPENROUTER_API_KEY</strong> - Check your configuration</li>
            <li>⚠️ <strong>LINKEDIN_ACCESS_TOKEN</strong> - Will be set automatically via OAuth</li>
            <li>⚠️ <strong>LINKEDIN_CLIENT_ID</strong> - Check your configuration</li>
            <li>⚠️ <strong>LINKEDIN_CLIENT_SECRET</strong> - Check your configuration</li>
          </ul>
        </div>

        <div class="container">
          <h3>Quick Actions</h3>
          <button onclick="checkGoogleStatus()">Check Google OAuth</button>
          <button onclick="checkLinkedInStatus()">Check LinkedIn OAuth</button>
          <button onclick="startGoogleOAuth()">Start Google OAuth</button>
          <button onclick="startLinkedInOAuth()">Start LinkedIn OAuth</button>
          <button onclick="testConnections()">Test All Connections</button>
          
          <div id="result" style="margin-top: 20px;"></div>
        </div>

        <script>
          async function checkGoogleStatus() {
            try {
              const response = await fetch('/api/auth/google/status');
              const data = await response.json();
              displayResult(data, response.ok);
            } catch (error) {
              displayResult({ error: error.message }, false);
            }
          }

          async function checkLinkedInStatus() {
            try {
              const response = await fetch('/api/auth/linkedin/status');
              const data = await response.json();
              displayResult(data, response.ok);
            } catch (error) {
              displayResult({ error: error.message }, false);
            }
          }

          async function startGoogleOAuth() {
            try {
              const response = await fetch('/api/auth/google/authorize');
              const data = await response.json();
              if (data.success && data.authUrl) {
                window.open(data.authUrl, '_blank');
                displayResult({ message: 'Google OAuth window opened. Complete authorization and return here.' }, true);
              } else {
                displayResult(data, response.ok);
              }
            } catch (error) {
              displayResult({ error: error.message }, false);
            }
          }

          async function startLinkedInOAuth() {
            try {
              const response = await fetch('/api/auth/linkedin/authorize');
              const data = await response.json();
              if (data.success && data.authUrl) {
                window.open(data.authUrl, '_blank');
                displayResult({ message: 'LinkedIn OAuth window opened. Complete authorization and return here.' }, true);
              } else {
                displayResult(data, response.ok);
              }
            } catch (error) {
              displayResult({ error: error.message }, false);
            }
          }

          async function testConnections() {
            try {
              const response = await fetch('/api/test-connections');
              const data = await response.json();
              displayResult(data, response.ok);
            } catch (error) {
              displayResult({ error: error.message }, false);
            }
          }

          function displayResult(data, success) {
            const resultDiv = document.getElementById('result');
            const className = success ? 'success' : 'error';
            resultDiv.innerHTML = \`<div class="status \${className}"><pre>\${JSON.stringify(data, null, 2)}</pre></div>\`;
          }
        </script>
      </body>
    </html>
  `);
});

// Manual trigger endpoint
app.post('/api/trigger-automation', async (req, res) => {
  try {
    logger.info('Manual automation trigger requested');
    const result = await linkedinAutomation.processWorkflow();
    res.json({
      success: true,
      message: 'Automation completed successfully',
      result
    });
  } catch (error) {
    logger.error('Manual automation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Automation failed',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get automation status
app.get('/api/status', async (req, res) => {
  try {
    const status = await linkedinAutomation.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
});

// Test all service connections
app.get('/api/test-connections', async (req, res) => {
  try {
    logger.info('Testing all service connections');
    const connectionResults = await linkedinAutomation.testAllConnections();
    res.json({
      success: true,
      connections: connectionResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
    });
  }
});

// Schedule the automation to run daily at 7 AM
const scheduleExpression = process.env.SCHEDULE_CRON || '50 11 * * *';

// Note: Vercel serverless functions don't support traditional cron jobs
// For Vercel deployment, consider using:
// 1. Vercel Cron (paid feature): https://vercel.com/docs/cron-jobs
// 2. GitHub Actions with scheduled workflows
// 3. External cron services that call your API endpoint

cron.schedule(scheduleExpression, async () => {
  try {
    logger.info('Scheduled automation started');
    await linkedinAutomation.processWorkflow();
    logger.info('Scheduled automation completed successfully');
  } catch (error) {
    logger.error('Scheduled automation failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // Mumbai/India time
});
logger.info(`Cron job scheduled: ${scheduleExpression} (Asia/Kolkata)`);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`LinkedIn Automation Server running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_CRON === 'true') {
    logger.info(`Scheduled to run daily at: ${scheduleExpression}`);
  }
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for Vercel
module.exports = app;
