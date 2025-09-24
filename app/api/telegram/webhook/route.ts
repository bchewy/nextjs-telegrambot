import { Bot, Context } from 'grammy'
import { NextRequest, NextResponse } from 'next/server'

let bot: Bot<Context> | null = null
let botInitialized = false

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

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'dummy-token-for-build') {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()
    console.log('Received webhook update:', JSON.stringify(body, null, 2))

    const botInstance = await getBot()
    await botInstance.handleUpdate(body)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'dummy-token-for-build'

  return NextResponse.json({
    status: 'Telegram Bot Webhook is running',
    endpoint: '/api/telegram/webhook',
    tokenConfigured: hasToken,
    note: 'Use POST method to handle webhook updates'
  })
}