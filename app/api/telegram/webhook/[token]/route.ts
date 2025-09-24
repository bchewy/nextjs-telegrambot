import { Bot, Context } from 'grammy'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

let bot: Bot<Context> | null = null
let botInitialized = false

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
        'Welcome to the bot! 👋\n\n' +
        'Available commands:\n' +
        '/start - Show this welcome message\n' +
        '/help - Get help information\n' +
        '/echo [text] - Echo back your message\n' +
        '/info - Get chat information'
      )
    })

    bot.command('help', async (ctx) => {
      await ctx.reply(
        'This is a Telegram bot running on Next.js and deployed to Vercel.\n\n' +
        'Commands:\n' +
        '/start - Welcome message\n' +
        '/help - This help message\n' +
        '/echo [text] - Echo your message\n' +
        '/info - Get chat information\n\n' +
        'You can also send any message and the bot will respond!'
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

    bot.on('message:text', async (ctx) => {
      const message = ctx.message.text
      if (!message.startsWith('/')) {
        await ctx.reply(`You said: "${message}"\n\nType /help to see available commands.`)
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