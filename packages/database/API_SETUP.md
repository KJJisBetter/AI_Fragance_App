# API Setup Guide

## Required Environment Variables

Create a `.env` file in your project root (or modify existing one) with:

```bash
# Perfumero API Configuration
PERFUMERO_API_KEY="your-rapidapi-key-here"
PERFUMERO_BASE_URL="https://perfumero1.p.rapidapi.com"

# Database Configuration
DATABASE_URL="your-database-url-here"
```

## How to Get Your API Key

1. Go to [RapidAPI Perfumero](https://rapidapi.com/perfumero/api/perfumero1)
2. Sign up/Login to RapidAPI
3. Subscribe to the Perfumero API (free tier available)
4. Copy your API key from the dashboard
5. Add it to your `.env` file

## Testing the API

Before running the seeding script, test your API connection:

```bash
npm run db:test-api
```

This will:
- ✅ Verify your API key works
- ✅ Check rate limits
- ✅ Test basic API calls
- ✅ Show usage statistics

## Common Issues

### 401 Unauthorized
- Check your API key is correct
- Verify you're subscribed to the API

### 429 Rate Limit
- You've exceeded rate limits
- Wait for the limit to reset
- Consider upgrading your plan

### Connection Issues
- Check your internet connection
- Verify the API service is running
- Check firewall/proxy settings

## Next Steps

Once the API test passes, you can safely run:
```bash
npm run db:seed-conservative  # Safe, 500 requests max
npm run db:seed-intelligent   # Standard seeding
npm run db:seed-aggressive    # Heavy seeding, 2000 requests max
```
