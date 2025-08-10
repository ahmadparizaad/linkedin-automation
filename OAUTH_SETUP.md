# OAuth Setup Guide

This guide helps you set up OAuth authentication for Google Sheets and LinkedIn APIs.

## Quick Start

1. **Check OAuth Status**: `GET /api/auth/status`
2. **Setup Google OAuth**: `GET /api/auth/google/authorize`
3. **Setup LinkedIn OAuth**: `GET /api/auth/linkedin/authorize`

## OAuth Endpoints

### General OAuth Endpoints

#### `GET /api/auth/status`
Get the status of all OAuth configurations.

**Response:**
```json
{
  "success": true,
  "allConfigured": true,
  "services": {
    "google": {
      "hasCredentials": true,
      "hasRefreshToken": true,
      "isValidToken": true,
      "needsAuth": false,
      "authUrl": null
    },
    "linkedin": {
      "hasCredentials": true,
      "hasAccessToken": true,
      "isValidToken": true,
      "needsAuth": false,
      "authUrl": null,
      "profile": {
        "id": "abc123",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }
}
```

#### `GET /api/auth/setup`
Get setup instructions and quick links for OAuth configuration.

#### `POST /api/auth/validate-all`
Validate all OAuth tokens and get renewal URLs if needed.

---

### Google OAuth Endpoints

#### `GET /api/auth/google/status`
Check Google OAuth configuration status.

#### `GET /api/auth/google/authorize`
Start Google OAuth flow or get authorization URL.

**Response when auth is needed:**
```json
{
  "success": true,
  "message": "Google OAuth authorization required",
  "authUrl": "https://accounts.google.com/oauth/authorize?...",
  "instructions": "Visit the authUrl to complete OAuth flow"
}
```

#### `GET /api/auth/google/callback`
OAuth callback endpoint (used automatically during OAuth flow).

#### `POST /api/auth/google/validate`
Validate current Google refresh token.

---

### LinkedIn OAuth Endpoints

#### `GET /api/auth/linkedin/status`
Check LinkedIn OAuth configuration status.

#### `GET /api/auth/linkedin/authorize`
Start LinkedIn OAuth flow or get authorization URL.

**Response when auth is needed:**
```json
{
  "success": true,
  "message": "LinkedIn OAuth authorization required",
  "authUrl": "https://www.linkedin.com/oauth/v2/authorization?...",
  "instructions": "Visit the authUrl to complete OAuth flow"
}
```

#### `GET /api/auth/linkedin/callback`
OAuth callback endpoint (used automatically during OAuth flow).

#### `POST /api/auth/linkedin/validate`
Validate current LinkedIn access token.

#### `POST /api/auth/linkedin/refresh`
Check if LinkedIn token needs renewal (tokens expire after 60 days).

---

## Setup Process

### 1. Initial Setup

Visit: `GET /api/auth/setup` to get setup instructions and current status.

### 2. Google OAuth Setup

1. Visit: `GET /api/auth/google/authorize`
2. Copy the `authUrl` from the response
3. Visit the URL in your browser
4. Complete Google OAuth flow
5. The callback will automatically save the refresh token to your `.env` file

**Required Google OAuth Scopes:**
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.readonly`

### 3. LinkedIn OAuth Setup

1. Visit: `GET /api/auth/linkedin/authorize`
2. Copy the `authUrl` from the response
3. Visit the URL in your browser
4. Complete LinkedIn OAuth flow
5. The callback will automatically save the access token and person ID to your `.env` file

**Required LinkedIn OAuth Scopes:**
- `r_liteprofile` (read profile)
- `w_member_social` (post content)

### 4. Verification

After setup, verify everything is working:
```bash
GET /api/auth/status
```

The response should show `allConfigured: true` and both services should have `isValidToken: true`.

---

## Environment Variables Updated

After successful OAuth setup, these variables will be automatically updated in your `.env` file:

```env
# Google OAuth
GOOGLE_REFRESH_TOKEN=1//0gMVnq06nqUA2...

# LinkedIn OAuth  
LINKEDIN_ACCESS_TOKEN=AQV...
LINKEDIN_PERSON_ID=abc123...
```

---

## Troubleshooting

### Google OAuth Issues

1. **Invalid refresh token**: Use `POST /api/auth/google/validate` to check token validity
2. **Scope issues**: Ensure your Google Cloud project has the required APIs enabled
3. **Redirect URI mismatch**: Verify your Google Cloud OAuth settings match `http://localhost:3000/api/auth/google/callback`

### LinkedIn OAuth Issues

1. **Invalid access token**: Use `POST /api/auth/linkedin/validate` to check token validity
2. **Token expired**: LinkedIn tokens expire after 60 days, use `POST /api/auth/linkedin/refresh` to check
3. **Scope issues**: Verify your LinkedIn app has the required permissions
4. **Redirect URI mismatch**: Verify your LinkedIn app settings match `http://localhost:3000/api/auth/linkedin/callback`

### General Issues

- **BASE_URL configuration**: Update `BASE_URL` in `.env` if not running on localhost:3000
- **HTTPS requirement**: For production, ensure you're using HTTPS URLs
- **Firewall/Network**: Ensure the server can make outbound HTTPS requests

---

## Security Notes

- OAuth tokens are stored in the `.env` file
- Refresh tokens (Google) are long-lived but can be revoked
- Access tokens (LinkedIn) expire after 60 days
- Always use HTTPS in production
- Keep your client secrets secure and never commit them to version control
