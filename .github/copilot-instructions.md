# AI Coding Agent Instructions

## Project Overview

This is a **Next.js 15 Telegram bot** with AI chat capabilities using Grammy framework and OpenAI integration. The bot runs serverless on Vercel with webhook-based architecture and token-secured endpoints.

## Core Architecture

### Webhook Security Pattern
- **URL Structure**: `/api/telegram/webhook/[token]/route.ts` - token is dynamic route parameter
- **Security**: Token validation in `validateTelegramRequest()` against `WEBHOOK_SECRET_TOKEN`
- **Deployment**: Vercel function with 10s max duration (`vercel.json`)

### Bot Lifecycle Management
- **Singleton Pattern**: Global `bot` variable with lazy initialization in `getBot()`
- **Serverless Consideration**: Bot must reinitialize on cold starts
- **Error Handling**: Global error catcher with `bot.catch()`

### Session Management (Critical)
```typescript
// In-memory Map - resets on cold starts
const chatSessions = new Map<string, {
  apiKey: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  lastActivity: number
}>()
```
- Sessions expire after 30 minutes
- API keys are NOT persisted (security by design)
- Auto-cleanup via `cleanupOldSessions()`

## Key Integration Patterns

### OpenAI Integration
- **Validation**: `validateOpenAIKey()` before storing in session
- **Error Handling**: Specific responses for 401 (auth), 429 (rate limit)
- **Message Chunking**: Split responses >4096 chars for Telegram limits
- **Model**: Uses `gpt-5` with system prompt for context

### Environment Variables (Required)
```bash
TELEGRAM_BOT_TOKEN=bot123:ABC...    # From @BotFather
WEBHOOK_SECRET_TOKEN=hex32...       # Generate with openssl rand -hex 32
```

## Development Workflows

### Local Development
```bash
npm run dev                         # Start Next.js dev server
# Use ngrok for webhook testing: ngrok http 3000
```

### Deployment Commands
```bash
# Deploy to Vercel
npx vercel --prod

# Set webhook (after deployment)
curl -F "url=https://yourapp.vercel.app/api/telegram/webhook/YOUR_SECRET_TOKEN" \
     "https://api.telegram.org/bot<TOKEN>/setWebhook"

# Verify webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Bot Command Patterns

### Command Registration
```typescript
bot.command('commandname', async (ctx) => {
  const text = ctx.match  // Text after command
  await ctx.reply('Response')
})
```

### Message Handlers
```typescript
bot.on('message:text', async (ctx) => {
  const message = ctx.message.text
  const chatId = ctx.chat?.id.toString()
  // Skip if starts with '/' (commands)
})
```

## Critical Code Patterns

### Session State Management
1. Check if session exists: `chatSessions.get(chatId)`
2. Update activity: `session.lastActivity = Date.now()`
3. Clean old sessions before processing
4. Handle API key collection flow separately from chat flow

### Error Boundaries
- Webhook validation fails → 401 Unauthorized
- Missing bot token → 500 Internal Server Error
- OpenAI API errors → User-friendly messages, session cleanup
- Long responses → Auto-split using `.match(/.{1,4096}/g)`

## Security Considerations

### Current Implementation
- Token-based webhook security (primary defense)
- HTTPS-only communication
- Environment variable storage
- **Note**: IP validation is commented out due to Vercel edge function limitations

### Known Limitations
- No rate limiting implemented
- API keys in session memory (acceptable for design goals)
- Webhook token in URL path (logs exposure risk)

## File Structure Conventions

```
app/
├── api/telegram/webhook/[token]/route.ts  # Main bot logic
├── layout.tsx                             # Basic Next.js layout
└── page.tsx                              # Status page

# Config files
├── vercel.json        # Function timeout: 10s
├── package.json       # Scripts: dev, build, start, lint  
└── tsconfig.json      # Standard Next.js TS config
```

## Common Modifications

### Adding New Commands
Add to `getBot()` function before `bot.catch()`:
```typescript
bot.command('newcmd', async (ctx) => {
  // Implementation
})
```

### Extending Session Data
Modify `chatSessions` Map type and initialization:
```typescript
const chatSessions = new Map<string, {
  // existing fields...
  newField: YourType
}>()
```

### OpenAI Model Changes
Update model in message handler:
```typescript
const response = await openai.responses.create({
  model: 'gpt-4-turbo',  // Change model here
  // ...
})
```

## Testing & Debugging

- **Local**: Use GET endpoint `/api/telegram/webhook/[token]` for status
- **Production**: Check Vercel function logs
- **Telegram**: Use `getWebhookInfo` API for webhook status
- **Sessions**: Add logging to `cleanupOldSessions()` for session debugging