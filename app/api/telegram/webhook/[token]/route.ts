import { Bot, Context } from 'grammy'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import OpenAI from 'openai'

let bot: Bot<Context> | null = null
let botInitialized = false

// In-memory storage for chat sessions (for serverless deployment)
// Note: This will reset on function cold start
const chatSessions = new Map<string, {
  apiKey: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  lastActivity: number
}>()

// Clean up old sessions (older than 30 minutes)
function cleanupOldSessions() {
  const now = Date.now()
  for (const [chatId, session] of chatSessions.entries()) {
    if (now - session.lastActivity > 30 * 60 * 1000) { // 30 minutes
      chatSessions.delete(chatId)
    }
  }
}

// Telegram IP ranges (update these periodically from https://core.telegram.org/bots/webhooks)
const TELEGRAM_IP_RANGES = [
  '149.154.160.0/20',
  '91.108.4.0/22',
  '91.108.8.0/22',
  '91.108.12.0/22',
  '91.108.16.0/22',
  '91.108.20.0/22',
  '91.108.56.0/22',
  '95.161.64.0/20',
  '91.105.192.0/23',
  '91.108.58.0/23',
  '149.154.172.0/22'
]

function isIpInRange(ip: string, range: string): boolean {
  // Simple IP validation - in production, use a proper IP range checker library
  // This is a basic implementation for demonstration
  return true // TODO: Implement proper IP range checking
}

async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey })
    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: 'test',
    })
    return true
  } catch (error) {
    console.error('OpenAI API key validation failed:', error)
    return false
  }
}

function validateTelegramRequest(req: NextRequest, token: string): boolean {
  // Check if token matches
  if (!process.env.WEBHOOK_SECRET_TOKEN || token !== process.env.WEBHOOK_SECRET_TOKEN) {
    console.error('Invalid webhook token')
    return false
  }

  // Get client IP
  const clientIp = req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   'unknown'

  // In production, validate IP is from Telegram
  // Note: This can be bypassed with header spoofing, so token is primary security
  // Uncomment for production:
  // const isValidIp = TELEGRAM_IP_RANGES.some(range => isIpInRange(clientIp, range))
  // if (!isValidIp) {
  //   console.error(`Request from non-Telegram IP: ${clientIp}`)
  //   return false
  // }

  return true
}

async function getBot() {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token || token === 'dummy-token-for-build') {
      throw new Error('TELEGRAM_BOT_TOKEN not configured')
    }

    bot = new Bot<Context>(token)

    bot.command('start', async (ctx) => {
      await ctx.reply(
        '🤖 Welcome to the AI Chat Bot! 👋\n\n' +
        'Available commands:\n' +
        '/start - Show this welcome message\n' +
        '/help - Get help information\n' +
        '/echo [text] - Echo back your message\n' +
        '/info - Get chat information\n' +
        '/chat - Start an AI conversation (requires OpenAI API key)\n' +
        '/endchat - End current AI conversation\n' +
        '/stop - Stop current AI conversation'
      )
    })

    bot.command('help', async (ctx) => {
      await ctx.reply(
        '🤖 AI Chat Bot Help\n\n' +
        'This is a Telegram bot with AI conversation capabilities.\n\n' +
        'Commands:\n' +
        '/start - Welcome message\n' +
        '/help - This help message\n' +
        '/echo [text] - Echo your message\n' +
        '/info - Get chat information\n' +
        '/chat - Start an AI conversation 🆕\n' +
        '/endchat - End current AI conversation 🆕\n' +
        '/stop - Stop current AI conversation 🆕\n\n' +
        '🆕 AI Chat Features:\n' +
        '• Use /chat to start an AI conversation\n' +
        '• Provide your OpenAI API key when prompted\n' +
        '• Chat naturally with AI assistance\n' +
        '• Use /stop or /endchat to end the conversation\n' +
        '• Sessions expire after 30 minutes of inactivity\n' +
        '• Your API key is not stored permanently\n\n' +
        'Regular messages (outside chat mode) will be echoed back.'
      )
    })

    bot.command('echo', async (ctx) => {
      const text = ctx.match
      if (text) {
        await ctx.reply(`Echo: ${text}`)
      } else {
        await ctx.reply('Please provide some text to echo. Example: /echo Hello World')
      }
    })

    bot.command('info', async (ctx) => {
      const chatInfo = ctx.chat
      const userInfo = ctx.from

      let infoMessage = `Chat Information:\n`
      infoMessage += `Chat ID: ${chatInfo?.id}\n`
      infoMessage += `Chat Type: ${chatInfo?.type}\n`

      if (userInfo) {
        infoMessage += `\nUser Information:\n`
        infoMessage += `User ID: ${userInfo.id}\n`
        infoMessage += `Username: ${userInfo.username || 'Not set'}\n`
        infoMessage += `First Name: ${userInfo.first_name || 'Not set'}\n`
        infoMessage += `Last Name: ${userInfo.last_name || 'Not set'}\n`
        infoMessage += `Is Bot: ${userInfo.is_bot}\n`
      }

      await ctx.reply(infoMessage)
    })

    bot.command('chat', async (ctx) => {
      const chatId = ctx.chat?.id.toString()
      if (!chatId) return

      const session = chatSessions.get(chatId)
      if (session) {
        await ctx.reply('You already have an active chat session. Send me any message to continue our conversation!')
        return
      }

      await ctx.reply(
        '🤖 Let\'s start a conversation!\n\n' +
        'To begin, please send your OpenAI API key. It will be validated but **not stored** - you\'ll need to provide it again when the session expires (30 minutes of inactivity).\n\n' +
        'Your API key should start with "sk-"...\n\n' +
        '⚠️ **Security Note**: Your API key will only be used for this conversation session and will be forgotten after 30 minutes of inactivity.'
      )

      // Initialize session waiting for API key
      chatSessions.set(chatId, {
        apiKey: '',
        messages: [],
        lastActivity: Date.now()
      })
    })

    bot.command('endchat', async (ctx) => {
      const chatId = ctx.chat?.id.toString()
      if (!chatId) return

      if (chatSessions.has(chatId)) {
        chatSessions.delete(chatId)
        await ctx.reply('👋 Chat session ended. Use /chat to start a new conversation!')
      } else {
        await ctx.reply('No active chat session found.')
      }
    })

    bot.command('stop', async (ctx) => {
      const chatId = ctx.chat?.id.toString()
      if (!chatId) return

      if (chatSessions.has(chatId)) {
        chatSessions.delete(chatId)
        await ctx.reply('🛑 Chat session stopped. Use /chat to start a new conversation!')
      } else {
        await ctx.reply('No active chat session to stop.')
      }
    })

    bot.on('message:text', async (ctx) => {
      const message = ctx.message.text
      const chatId = ctx.chat?.id.toString()

      if (!chatId) return

      // Skip command messages
      if (message.startsWith('/')) {
        return
      }

      const session = chatSessions.get(chatId)

      if (!session) {
        await ctx.reply(`You said: "${message}"\n\nType /help to see available commands, or /chat to start an AI conversation!`)
        return
      }

      // Update last activity
      session.lastActivity = Date.now()
      cleanupOldSessions()

      // If no API key set yet, expect it to be the API key
      if (!session.apiKey) {
        if (message.startsWith('sk-') && message.length > 40) {
          // Validate API key
          const isValid = await validateOpenAIKey(message)

          if (isValid) {
            session.apiKey = message
            await ctx.reply('✅ API key validated! You can now start our conversation. What would you like to talk about?')
          } else {
            await ctx.reply('❌ Invalid API key. Please check your OpenAI API key and try again.\n\nYour API key should start with "sk-" and be valid.')
            chatSessions.delete(chatId)
          }
        } else {
          await ctx.reply('Please send a valid OpenAI API key. It should start with "sk-"...\n\nIf you need an API key, visit: https://platform.openai.com/api-keys')
        }
        return
      }

      // Process the message with OpenAI
      try {
        // Add user message to history
        session.messages.push({ role: 'user', content: message })

        const openai = new OpenAI({ apiKey: session.apiKey })

        // Create conversation history for context
        const conversation = [
          { role: 'system' as const, content: 'You are a helpful AI assistant. Be concise but thorough in your responses.' },
          ...session.messages
        ]

        const response = await openai.responses.create({
          model: 'gpt-5',
          input: conversation,
        })

        const aiResponse = response.output_text

        // Add assistant response to history
        session.messages.push({ role: 'assistant', content: aiResponse })

        // Send response (handle potential length limits)
        if (aiResponse.length > 4096) {
          // Split long messages
          const chunks = aiResponse.match(/.{1,4096}/g) || [aiResponse]
          for (const chunk of chunks) {
            await ctx.reply(chunk.trim())
          }
        } else {
          await ctx.reply(aiResponse)
        }

      } catch (error: any) {
        console.error('OpenAI API error:', error)

        if (error.status === 401) {
          await ctx.reply('❌ Authentication error. Your API key may be invalid or expired. Please start a new session with /chat.')
          chatSessions.delete(chatId)
        } else if (error.status === 429) {
          await ctx.reply('⚠️ Rate limit exceeded. Please wait a moment and try again.')
        } else {
          await ctx.reply('❌ An error occurred while processing your message. Please try again.')
        }
      }
    })

    bot.catch((err) => {
      console.error('Error in bot:', err)
    })
  }

  if (!botInitialized) {
    await bot.init()
    botInitialized = true
  }

  return bot
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate request is from Telegram
    if (!validateTelegramRequest(req, token)) {
      console.error('Unauthorized webhook request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'dummy-token-for-build') {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()

    // Don't log sensitive information in production
    if (process.env.NODE_ENV === 'development') {
      console.log('Received webhook update:', JSON.stringify(body, null, 2))
    }

    const botInstance = await getBot()
    await botInstance.handleUpdate(body)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Don't expose error details in production
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Only show status if token is valid
  if (!process.env.WEBHOOK_SECRET_TOKEN || token !== process.env.WEBHOOK_SECRET_TOKEN) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'dummy-token-for-build'

  return NextResponse.json({
    status: 'Telegram Bot Webhook is running',
    endpoint: '/api/telegram/webhook/[token]',
    tokenConfigured: hasToken,
    note: 'Webhook is secured with token validation'
  })
}