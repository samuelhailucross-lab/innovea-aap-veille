import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await req.json()
    const filePath = path.join(process.cwd(), 'data', 'aap-data.json')
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
