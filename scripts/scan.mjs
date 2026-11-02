// Weekly scan for new funding calls and changed pages.
// Run by .github/workflows/weekly-scan.yml (Node 20, no dependencies).
//
// Nothing found here is published directly: results go into `candidats`
// in data/aap-data.json and wait for "Valider" / "Rejeter" in /admin.
//
//   1. EU   — EU Funding & Tenders Portal search API (open + forthcoming topics)
//   2. FR   — each French guichet page is fingerprinted; a change creates a
//             "page modifiée" item to review
//   3. FR   — listing pages are watched for new call links

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DATA_FILE = path.join(ROOT, 'data', 'aap-data.json')
const STATE_FILE = path.join(ROOT, 'data', 'scan-state.json')

const MAX_NEW_PER_RUN = 40
const UA = 'Mozilla/5.0 (compatible; INNOVEA-AAP-Veille/1.0; +https://innovea-aap-veille.vercel.app)'

// ---------- EU: Funding & Tenders Portal ----------
const EU_API = 'https://api.tech.ec.europa.eu/search-api/prod/rest/search'
const EU_SEARCHES = [
  'medical device',
  'medical imaging',
  'in vitro diagnostic',
  'diagnostics',
  'digital health',
  'artificial intelligence health',
  'health technologies',
  'radiopharmaceutical',
  'theranostics',
  'HORIZON-HLTH',
  'EU4H',
  'EIC Accelerator',
  'EIC Pathfinder',
  'EIC Transition',
  'Innovative Health Initiative',
  // Therapeutic areas and device families
  'oncology',
  'cardiovascular',
  'stroke',
  'neurodegenerative',
  'Alzheimer',
  'implantable',
  'surgical robotics',
  'robotic surgery',
]
// Kept: the EIC instruments and IHI topics always; otherwise a topic whose
// identifier, title or call mentions a MedTech term and no pharma/off-scope term.
const ALWAYS = /^HORIZON-EIC-\d{4}-(ACCELERATOR|PATHFINDER|TRANSITION)|^HORIZON-JU-IHI/i
const MEDTECH = /medical device|medtech|med-tech|imaging|diagnos|in vitro|point-of-care|radiolog|radiotherap|radiopharm|nuclear medicine|theranost|digital health|e-health|ehealth|health data|clinical decision|virtual human twin|artificial intelligence|\bAI\b|biomarker|monitoring|sensor|robot|telemedic|health technolog|healthcare system|hospital|procurement|oncolog|cancer|cardio|stroke|neurodegenerat|alzheimer|dementia|implant|surg|robotic/i
const HEALTH = /health|santé|medic|clinic|patient|hospital|diagnos|imaging|cancer|disease|care\b|healthcare|^HORIZON-HLTH|^HORIZON-MISS-\d{4}-\d{2}-CANCER|^EU4H/i
const EXCLUDE = /antibod|antivir|antimicrob|vaccin|small molecule|monoclonal|operating grant|CBRN|protective gear|cell-free protein|bio-?printing|exposome|climate|soil/i
const STATUS_FORTHCOMING = '31094501'
const STATUS_OPEN = '31094502'

// ---------- FR: listing pages watched for new links ----------
const LINK_WATCH = [
  {
    name: 'Bpifrance — appels à projets et concours',
    organisme: 'Bpifrance',
    url: 'https://www.bpifrance.fr/nos-appels-a-projets-concours',
    linkPattern: /\/nos-appels-a-projets-concours\/[a-z0-9-]{8,}/i,
    relevance: /sant|medic|dispositif|biomed|bio-|biotech|imagerie|diagnost|numerique|dmn|hopital|soin|ia-|intelligence-artificielle/i,
  },
  {
    name: 'ANS — appels à projets e-santé',
    organisme: 'Agence du Numérique en Santé (ANS)',
    url: 'https://esante.gouv.fr/lagence/appels-a-projets',
    linkPattern: /esante\.gouv\.fr\/.*appels?-(a-)?projets?|^\/.*appels?-(a-)?projets?/i,
    relevance: /./,
  },
]

const today = new Date().toISOString().split('T')[0]
const log = []
function note(msg) {
  console.log(msg)
  log.push(msg)
}

function first(v) {
  return Array.isArray(v) ? v[0] : v
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// Visible text of the main content, for fingerprinting.
function pageText(html) {
  let h = html
  const main = h.match(/<main[\s\S]*?<\/main>/i)
  if (main) h = main[0]
  return h
    .replace(/<(script|style|noscript|svg|iframe|form|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\b[\da-f]{7,}\b/gi, ' ') // build ids, cache busters
    .replace(/\s+/g, ' ')
    .trim()
}

function sha(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()
}

function organismeFor(id) {
  if (/^HORIZON-EIC/i.test(id)) return 'Commission européenne / EIC'
  if (/^HORIZON-HLTH|^HORIZON-JU-IHI|^HORIZON-JU/i.test(id)) return 'Commission européenne / HaDEA'
  if (/^EU4H/i.test(id)) return 'EU4Health / HaDEA'
  if (/^DIGITAL/i.test(id)) return 'Digital Europe'
  if (/^HORIZON/i.test(id)) return 'Commission européenne / Horizon Europe'
  return 'Commission européenne'
}

// ---------- 1. EU ----------
async function scanEu(isKnown) {
  const found = new Map()
  for (const text of EU_SEARCHES) {
    try {
      const form = new FormData()
      form.append(
        'query',
        new Blob(
          [JSON.stringify({ bool: { must: [{ terms: { type: ['1', '2'] } }, { terms: { status: [STATUS_FORTHCOMING, STATUS_OPEN] } }] } })],
          { type: 'application/json' }
        )
      )
      form.append('languages', new Blob([JSON.stringify(['en'])], { type: 'application/json' }))
      const qs = new URLSearchParams({ apiKey: 'SEDIA', text, pageSize: '50', pageNumber: '1' })
      const res = await fetch(`${EU_API}?${qs}`, { method: 'POST', body: form, signal: AbortSignal.timeout(45000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const results = json.results || []
      let kept = 0
      for (const r of results) {
        const m = r.metadata || {}
        const id = first(m.identifier) || first(m.callIdentifier)
        if (!id || found.has(id)) continue
        const title = stripHtml(first(m.title) || r.title || r.summary || id)
        const callTitle = stripHtml(first(m.callTitle) || '')
        const text = `${id} ${title} ${callTitle}`
        if (!ALWAYS.test(id) && (EXCLUDE.test(text) || !HEALTH.test(text) || !MEDTECH.test(text))) continue
        // Earliest deadline still to come (two-stage topics have two)
        const dates = (Array.isArray(m.deadlineDate) ? m.deadlineDate : [m.deadlineDate])
          .filter(Boolean)
          .map((d) => String(d).slice(0, 10))
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort()
        const future = dates.filter((d) => d >= today)
        if (dates.length > 0 && future.length === 0) continue
        const status = first(m.status)
        found.set(id, {
          id: `eu-${id.toLowerCase()}`,
          kind: 'nouveau',
          source: 'EU-FT',
          detectedAt: today,
          nom: title,
          organisme: organismeFor(id),
          niveau: 'EU',
          url: `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${id.toLowerCase()}`,
          deadline: future[0] || null,
          callId: id,
          description: [
            status === STATUS_FORTHCOMING ? 'Appel à venir (pas encore ouvert).' : 'Appel ouvert.',
            callTitle ? `Call : ${callTitle}.` : '',
            future.length > 1 ? `Échéances : ${future.join(', ')}.` : '',
          ].filter(Boolean).join(' '),
        })
        kept++
      }
      note(`EU « ${text} » : ${results.length} résultats, ${kept} retenus`)
      if (results.length > 0 && kept === 0 && found.size === 0) {
        note(`  (exemple de clés : ${Object.keys(results[0].metadata || results[0]).slice(0, 15).join(', ')})`)
      }
    } catch (e) {
      note(`EU « ${text} » : ERREUR ${e.message}`)
    }
  }
  return [...found.values()].filter((c) => !isKnown(c.id, c.callId))
}

// ---------- 2. FR pages ----------
async function scanPages(data, state) {
  const out = []
  for (const g of data.guichets.filter((g) => g.niveau === 'FR' && g.url)) {
    try {
      const text = pageText(await fetchText(g.url))
      if (text.length < 200) {
        note(`Page ${g.id} : contenu trop court (${text.length} car.), probablement chargé en JavaScript — ignorée`)
        continue
      }
      const h = sha(text)
      const prev = state.pages[g.url]
      state.pages[g.url] = { hash: h, checkedAt: today, text: text.slice(0, 20000) }
      if (!prev || !prev.text) {
        note(`Page ${g.id} : empreinte initiale enregistrée`)
        continue
      }
      if (prev.hash === h) {
        note(`Page ${g.id} : inchangée`)
        continue
      }
      // Sentences present now but not before: shown to the reviewer.
      const split = (t) => (t || '').split(/(?<=[.!?:;])\s+/).map((x) => x.trim()).filter((x) => x.length > 15)
      const before = new Set(split(prev.text))
      const added = split(text).filter((x) => !before.has(x))
      if (prev.text && added.length === 0) {
        note(`Page ${g.id} : changement mineur (ordre ou suppression), ignoré`)
        continue
      }
      const snippet = added.slice(0, 3).map((x) => (x.length > 220 ? x.slice(0, 220) + '…' : x)).join(' / ')
      note(`Page ${g.id} : MODIFIÉE — ${snippet.slice(0, 300)}`)
      const pending = (data.candidats || []).some((c) => c.kind === 'modifie' && c.guichetId === g.id)
      if (pending) continue
      out.push({
        id: `page-${g.id}-${today}`,
        kind: 'modifie',
        source: 'page',
        detectedAt: today,
        nom: `Page modifiée : ${g.nom}`,
        organisme: g.organisme,
        niveau: g.niveau,
        url: g.url,
        deadline: null,
        guichetId: g.id,
        description: snippet
          ? `Nouveau texte sur la page : « ${snippet} »`
          : 'Le contenu de la page du guichet a changé depuis le dernier scan. Vérifier les dates et le statut.',
      })
    } catch (e) {
      note(`Page ${g.id} : ERREUR ${e.message}`)
    }
  }
  return out
}

// ---------- 3. FR new links ----------
async function scanLinks(state, isKnown) {
  const out = []
  for (const w of LINK_WATCH) {
    try {
      const html = await fetchText(w.url)
      const links = new Map()
      for (const m of html.matchAll(/<a\b[^>]*href="([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
        let href = m[1]
        if (!w.linkPattern.test(href)) continue
        href = new URL(href, w.url).href.replace(/\/$/, '')
        const label = stripHtml(m[2])
        if (!links.has(href) || (label && !links.get(href))) links.set(href, label)
      }
      const prev = state.links[w.url]
      state.links[w.url] = [...links.keys()].sort()
      if (!prev) {
        note(`Liens ${w.name} : ${links.size} liens initiaux enregistrés`)
        continue
      }
      const prevSet = new Set(prev)
      let added = 0
      for (const [href, label] of links) {
        if (prevSet.has(href)) continue
        if (!w.relevance.test(`${href} ${label}`)) continue
        const id = `lien-${sha(href)}`
        if (isKnown(id, null, href)) continue
        out.push({
          id,
          kind: 'nouveau',
          source: 'liens',
          detectedAt: today,
          nom: label || href.split('/').pop().replace(/-/g, ' '),
          organisme: w.organisme,
          niveau: 'FR',
          url: href,
          deadline: null,
          description: `Nouveau lien apparu sur ${w.name}. Ouvrir la page pour vérifier la date de clôture.`,
        })
        added++
      }
      note(`Liens ${w.name} : ${links.size} liens, ${added} nouveaux pertinents`)
    } catch (e) {
      note(`Liens ${w.name} : ERREUR ${e.message}`)
    }
  }
  return out
}

// ---------- main ----------
async function main() {
  const data = readJson(DATA_FILE, null)
  if (!data) throw new Error('data/aap-data.json illisible')
  data.candidats = data.candidats || []
  data.traites = data.traites || []
  const state = readJson(STATE_FILE, { pages: {}, links: {} })
  state.pages = state.pages || {}
  // Fingerprint format changed: re-baseline pages once rather than flag them.
  if (state.version !== 2) {
    state.pages = {}
    state.version = 2
  }
  state.links = state.links || {}

  const traites = new Set(data.traites)
  const pendingIds = new Set(data.candidats.map((c) => c.id))
  const knownText = JSON.stringify(data.guichets).toLowerCase()
  const isKnown = (id, callId, url) =>
    traites.has(id) ||
    pendingIds.has(id) ||
    (callId && knownText.includes(callId.toLowerCase())) ||
    (url && knownText.includes(url.toLowerCase()))

  const fresh = [
    ...(await scanEu(isKnown)),
    ...(await scanPages(data, state)),
    ...(await scanLinks(state, isKnown)),
  ]
  const added = fresh.slice(0, MAX_NEW_PER_RUN)
  if (fresh.length > added.length) note(`${fresh.length - added.length} éléments au-delà de la limite reportés au prochain scan`)

  data.candidats.push(...added)
  data.meta = { ...data.meta, lastScan: today }
  state.lastRun = new Date().toISOString()
  state.lastAdded = added.length
  state.log = log

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n')
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n')
  note(`Terminé : ${added.length} élément(s) ajouté(s) à valider, ${data.candidats.length} en attente au total`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
