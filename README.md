# Next.js Telegram Bot

A Telegram bot built with Next.js and Grammy, ready to deploy on Vercel.

## Features

- Built with Next.js 15 and TypeScript
- Grammy framework for Telegram bot functionality
- Webhook-based architecture (perfect for serverless)
- Ready for Vercel deployment
- Command handlers included
- **Security**: Webhook token validation for protection against unauthorized requests

## Available Bot Commands

- `/start` - Welcome message and command list
- `/help` - Help information
- `/echo [text]` - Echo back your message
- `/info` - Get chat and user information
- Any text message - Bot will respond to regular messages

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Save the bot token you receive

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your tokens to `.env.local`:
   ```
   TELEGRAM_BOT_TOKEN=YOUR_ACTUAL_BOT_TOKEN_HERE
   WEBHOOK_SECRET_TOKEN=YOUR_SECRET_TOKEN_HERE
   ```

   Generate a secure webhook token:
   ```bash
   openssl rand -hex 32
   ```

### 3. Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Your bot webhook will be available at:
   ```
   http://localhost:3000/api/telegram/webhook/YOUR_SECRET_TOKEN
   ```

   Note: For local testing, you'll need to use a tunneling service like ngrok to expose your local webhook to Telegram.

### 4. Deploy to Vercel

1. Push your code to a GitHub repository

2. Import the project to Vercel:
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. Configure environment variables in Vercel:
   - Add `TELEGRAM_BOT_TOKEN` with your bot token value
   - Add `WEBHOOK_SECRET_TOKEN` with your secret token (use `openssl rand -hex 32` to generate)

4. Deploy the project

5. Once deployed, set the webhook URL for your bot with your secret token:
   ```bash
   curl -F "url=https://YOUR-VERCEL-URL.vercel.app/api/telegram/webhook/YOUR_SECRET_TOKEN" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

   Replace:
   - `YOUR-VERCEL-URL` with your actual Vercel deployment URL
   - `<YOUR_BOT_TOKEN>` with your actual bot token

### 5. Verify Webhook

Check if the webhook is set correctly:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## Project Structure

```
nextjs-telegrambot/
├── app/
│   ├── api/
│   │   └── telegram/
│   │       └── webhook/
│   │           └── route.ts    # Telegram webhook handler
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx               # Home page
├── .env.local                  # Local environment variables (not in git)
├── .env.example               # Example environment variables
├── next.config.js             # Next.js configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── vercel.json               # Vercel configuration
```

## Development

To add new commands, edit `app/api/telegram/webhook/route.ts`:

```typescript
bot.command('yourcommand', async (ctx) => {
  await ctx.reply('Your response here')
})
```

## Troubleshooting

1. **Webhook not receiving updates**:
   - Ensure your Vercel deployment URL is correct
   - Check that the bot token is properly set in environment variables
   - Verify webhook info using the getWebhookInfo endpoint

2. **Bot not responding**:
   - Check Vercel function logs for errors
   - Ensure the TELEGRAM_BOT_TOKEN is correctly set
   - Verify the webhook URL is properly configured

3. **Local development issues**:
   - For local testing, use ngrok or similar to expose your local server
   - Set the webhook to your ngrok URL for testing

## Security Considerations

### Current Security Measures
- **Webhook Token**: The webhook URL includes a secret token that must match the configured `WEBHOOK_SECRET_TOKEN`
- **HTTPS Only**: All webhook communication happens over encrypted HTTPS
- **Environment Variables**: Sensitive tokens are stored as environment variables, never in code

### Known Limitations & Risks

⚠️ **Important Security Notes**:

1. **IP Validation Not Enforced**: While the code includes Telegram IP ranges, IP validation is currently commented out because:
   - Vercel's edge functions may not provide reliable client IPs
   - IP headers can be spoofed
   - Telegram's IP ranges can change

2. **No Rate Limiting**: The current implementation doesn't include rate limiting, which means:
   - Potential for abuse if webhook URL is discovered
   - Could lead to excessive Telegram API calls
   - May incur Vercel function execution costs

3. **Token in URL**: The secret token is part of the URL path, which:
   - Can appear in server logs
   - Might be exposed in error messages
   - Should be rotated periodically

4. **No Request Signature Validation**: Telegram doesn't sign webhook requests, unlike some other platforms

### Recommended Security Enhancements

For production use, consider:

1. **Implement Rate Limiting**: Use Vercel's Edge Config or a service like Upstash Redis
2. **Add Request Validation**: Store and validate update_id to prevent replay attacks
3. **Monitor Webhook Activity**: Log suspicious requests and set up alerts
4. **Rotate Tokens Regularly**: Change `WEBHOOK_SECRET_TOKEN` periodically
5. **Use Telegram's IP Whitelist**: Uncomment IP validation in production if you have reliable IP data
6. **Add Request Size Limits**: Prevent large payload attacks

### Minimal Security Setup (Current)

The current setup provides basic protection through:
- Secret token in webhook URL
- HTTPS encryption
- Environment variable storage

This is sufficient for:
- Personal bots
- Low-traffic bots
- Development/testing

But may not be adequate for:
- Public-facing production bots
- Bots handling sensitive data
- High-traffic applications

## License

MIT