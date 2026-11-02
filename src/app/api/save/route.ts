import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

// Saves aap-data.json by committing it to GitHub.
// Vercel's file system is read-only, so the commit is what persists the change;
// the commit then triggers a Vercel redeploy (~1 min).

const REPO = process.env.GITHUB_REPO || 'samuelhailucross-lab/innovea-aap-veille'
const BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'data/aap-data.json'

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé — reconnectez-vous' }, { status: 401 })
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN manquant dans les variables Vercel' }, { status: 500 })
  }

  let data: any
  try {
    data = await req.json()
  } catch {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }
  if (!data || !Array.isArray(data.guichets)) {
    return NextResponse.json({ error: 'Format invalide : "guichets" manquant' }, { status: 400 })
  }

  const api = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // 1. Get the current file SHA (GitHub requires it to update a file)
  const current = await fetch(`${api}?ref=${BRANCH}`, { headers, cache: 'no-store' })
  if (!current.ok) {
    return NextResponse.json(
      { error: `Lecture GitHub impossible (${current.status}) — vérifier le token et ses droits` },
      { status: 502 }
    )
  }
  const { sha } = await current.json()

  // 2. Commit the new content
  const content = Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf-8').toString('base64')
  const put = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `data: mise à jour via admin (${data.meta?.lastUpdated ?? 'sans date'})`,
      content,
      sha,
      branch: BRANCH,
    }),
  })

  if (!put.ok) {
    const detail = await put.text()
    console.error('GitHub commit failed', put.status, detail)
    return NextResponse.json(
      { error: `Commit GitHub refusé (${put.status}) — vérifier les droits "Contents: write" du token` },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
