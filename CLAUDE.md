# Telegram Bot on Next.js

## Project Overview
This is a Telegram bot built with Next.js and the Grammy framework, deployed on Vercel. It uses a webhook-based architecture perfect for serverless deployment.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Bot Framework**: Grammy
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## Project Structure
```
nextjs-telegrambot/
├── app/
│   ├── api/
│   │   └── telegram/
│   │       └── webhook/
│   │           └── route.ts    # Main bot webhook handler
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── .env.local                  # Local environment variables
├── package.json
├── tsconfig.json
└── vercel.json                # Vercel configuration
```

## How It Works

### Architecture
```
User → Telegram → Webhook (https://tbot.chew.sh/api/telegram/webhook) → Next.js API Route → Bot Logic → Response → User
```

### Key Components
1. **Webhook Handler** (`app/api/telegram/webhook/route.ts`)
   - Receives POST requests from Telegram
   - Initializes bot on first request (lazy loading)
   - Processes updates through Grammy framework
   - Returns responses to Telegram

2. **Bot Commands**
   - `/start` - Welcome message with command list
   - `/help` - Detailed help information
   - `/echo [text]` - Echoes back the provided text
   - `/info` - Shows chat and user information
   - Regular text messages - Bot responds with echo

### Serverless Benefits
- No persistent server needed
- Auto-scales with traffic
- Pay only for actual usage
- Perfect for bots with variable traffic

## Development

### Local Development
```bash
npm run dev
```
Note: For local testing, you'll need a tunnel service like ngrok to expose your local webhook to Telegram.

### Environment Variables
Required in `.env.local`:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Testing Commands
```bash
# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Test webhook endpoint
curl -X GET "https://tbot.chew.sh/api/telegram/webhook"

# Send test update (for debugging)
curl -X POST "https://tbot.chew.sh/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"message":{"text":"/start","chat":{"id":123}}}'
```

## Deployment

### Deploy to Vercel
```bash
npx vercel --prod
```

### Set Webhook
After deployment, set the webhook URL:
```bash
curl -F "url=https://tbot.chew.sh/api/telegram/webhook" \
     "https://api.telegram.org/bot<TOKEN>/setWebhook"
```

### Environment Variables in Vercel
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `TELEGRAM_BOT_TOKEN` with your bot token
3. Select all environments (Production, Preview, Development)

## Common Issues & Solutions

### Bot Not Responding
1. Check webhook info for errors
2. Verify environment variable is set in Vercel
3. Check Vercel function logs for errors

### 500 Errors
- Usually means bot token is not configured
- Check environment variables in Vercel dashboard

### Webhook Not Receiving Updates
- Ensure webhook URL is correctly set
- Verify bot token is valid
- Check pending_update_count in webhook info

## Bot Creation Steps
1. Message @BotFather on Telegram
2. Send `/newbot` and follow prompts
3. Save the bot token
4. Set username for your bot
5. Configure webhook with deployment URL

## Security Notes
- Bot token is stored as environment variable (never in code)
- Webhook URL acts as authentication
- All communication is over HTTPS
- No sensitive data logged

## Adding New Features

### Add a New Command
Edit `app/api/telegram/webhook/route.ts`:
```typescript
bot.command('yourcommand', async (ctx) => {
  await ctx.reply('Your response here')
})
```

### Add Message Handlers
```typescript
// Handle specific message types
bot.on('message:photo', async (ctx) => {
  await ctx.reply('Nice photo!')
})

// Handle callback queries (for inline keyboards)
bot.on('callback_query:data', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.reply(`You clicked: ${ctx.callbackQuery.data}`)
})
```

## Production URL
- **Bot**: Talk to the bot on Telegram
- **Webhook**: https://tbot.chew.sh/api/telegram/webhook
- **Status Page**: https://tbot.chew.sh (shows bot info)

## Resources
- [Grammy Documentation](https://grammy.dev)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)