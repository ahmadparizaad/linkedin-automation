# LinkedIn OAuth Troubleshooting Guide

## Error: `unauthorized_scope_error`

This error occurs when your LinkedIn application doesn't have permission to use the requested OAuth scopes.

## Quick Fix Steps

### 1. Check LinkedIn App Configuration

Visit your LinkedIn Developer Console:
1. Go to https://www.linkedin.com/developers/apps
2. Select your application
3. Check the "Auth" tab

### 2. Verify OAuth Settings

Ensure these settings in your LinkedIn app:

**Authorized Redirect URLs:**
```
http://localhost:3000/api/auth/linkedin/callback
```

**OAuth 2.0 Scopes:**
- ✅ `r_emailaddress` - Read email address
- ✅ `r_liteprofile` - Read basic profile
- ⚠️ `w_member_social` - Write posts (requires special approval)

### 3. Current Scope Configuration

The system is currently configured to use minimal scopes:
- `r_emailaddress`
- `r_liteprofile`

### 4. For Posting Capabilities

To post to LinkedIn, you need:
1. **Marketing Developer Platform** access
2. **w_member_social** scope approval
3. LinkedIn app review process

## Testing Steps

### Step 1: Test Basic OAuth
```bash
GET /api/auth/linkedin/diagnostic
```

### Step 2: Try Authorization
```bash
GET /api/auth/linkedin/authorize
```

### Step 3: Complete OAuth Flow
1. Visit the `authUrl` from step 2
2. Complete LinkedIn authorization
3. Check if callback succeeds

## Alternative Solutions

### Option 1: Use LinkedIn API v1 (Deprecated)
- Limited time remaining
- Simpler permissions
- Not recommended for new apps

### Option 2: Manual Token Configuration
If you have a valid access token from another source:

```bash
# Set in .env file
LINKEDIN_ACCESS_TOKEN=your_actual_token_here
LINKEDIN_PERSON_ID=your_person_id_here
```

### Option 3: Apply for Marketing Developer Platform
1. Visit: https://www.linkedin.com/developers/apps
2. Apply for Marketing Developer Platform access
3. Wait for approval (can take several weeks)
4. Add `w_member_social` scope

## Current Workaround

For immediate testing, you can:

1. **Remove posting functionality** temporarily
2. **Use basic profile scopes** only
3. **Test other parts** of the automation
4. **Apply for full permissions** in parallel

## Environment Variable Fix

Update your `.env` file with working credentials:

```env
# Use your actual LinkedIn app credentials
LINKEDIN_CLIENT_ID=your_actual_client_id
LINKEDIN_CLIENT_SECRET=your_actual_client_secret

# These will be set after successful OAuth
LINKEDIN_ACCESS_TOKEN=will_be_set_automatically
LINKEDIN_PERSON_ID=will_be_set_automatically
```

## Test Commands

```bash
# Check configuration
GET /api/auth/linkedin/diagnostic

# Check current status
GET /api/auth/linkedin/status

# Start OAuth (with minimal scopes)
GET /api/auth/linkedin/authorize

# Validate token (after OAuth)
POST /api/auth/linkedin/validate
```

## LinkedIn App Requirements Checklist

- [ ] LinkedIn Developer account created
- [ ] LinkedIn app created and configured
- [ ] Correct redirect URI set
- [ ] Required scopes enabled
- [ ] App privacy policy URL (if required)
- [ ] App terms of service URL (if required)
- [ ] Marketing Developer Platform access (for posting)

## Next Steps

1. **Immediate**: Use basic scopes for profile access
2. **Short-term**: Test automation without LinkedIn posting
3. **Long-term**: Apply for Marketing Developer Platform access
4. **Alternative**: Consider other social media APIs
