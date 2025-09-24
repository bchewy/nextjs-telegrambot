# Next.js Telegram Bot

A Telegram bot built with Next.js and Grammy, ready to deploy on Vercel.

## Features

- Built with Next.js 15 and TypeScript
- Grammy framework for Telegram bot functionality
- Webhook-based architecture (perfect for serverless)
- Ready for Vercel deployment
- Command handlers included

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

2. Add your Telegram bot token to `.env.local`:
   ```
   TELEGRAM_BOT_TOKEN=YOUR_ACTUAL_BOT_TOKEN_HERE
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
   http://localhost:3000/api/telegram/webhook
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

4. Deploy the project

5. Once deployed, set the webhook URL for your bot:
   ```bash
   curl -F "url=https://YOUR-VERCEL-URL.vercel.app/api/telegram/webhook" \
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

## License

MIT