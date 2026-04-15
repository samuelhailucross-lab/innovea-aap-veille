import { NextRequest, NextResponse } from 'next/server'
import { loadData, getFlatDeadlines } from '@/lib/data'
import { sendMonthlyDigest } from '@/lib/email'

export async function POST(req: NextRequest) {
  // Verify the request comes from GitHub Actions via a shared secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = loadData()
  const flatDeadlines = getFlatDeadlines(data)

  const recipients = (process.env.NOTIFY_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients configured in NOTIFY_EMAILS' }, { status: 400 })
  }

  await sendMonthlyDigest(flatDeadlines, recipients)

  return NextResponse.json({ ok: true, sent_to: recipients.length })
}

// Also support GET for manual testing from browser (with auth)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(req)
}
