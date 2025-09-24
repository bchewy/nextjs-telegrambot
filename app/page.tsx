export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Telegram Bot</h1>
        <p className="text-lg text-gray-600">
          This is a Next.js application running a Telegram bot webhook.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Bot webhook endpoint: /api/telegram/webhook
        </p>
      </div>
    </main>
  )
}