import { AapData, FlatDeadline, Guichet } from './types'
import { differenceInDays, parseISO, isValid } from 'date-fns'
import path from 'path'
import fs from 'fs'

export function loadData(): AapData {
  const filePath = path.join(process.cwd(), 'data', 'aap-data.json')
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as AapData
}

export function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = parseISO(dateStr)
  if (!isValid(d)) return null
  return differenceInDays(d, new Date())
}

export function getFlatDeadlines(data: AapData): FlatDeadline[] {
  const flat: FlatDeadline[] = []
  for (const g of data.guichets) {
    for (const dl of g.deadlines) {
      flat.push({
        guichetId: g.id,
        guichetNom: g.nom,
        organisme: g.organisme,
        niveau: g.niveau,
        url: g.url,
        deadline: dl,
        daysUntil: getDaysUntil(dl.date),
      })
    }
  }
  // Sort: upcoming dates first, then open-continuous, then surveillance, then closed
  return flat.sort((a, b) => {
    const order = { ouvert: 0, ouvert_continu: 2, a_surveiller: 3, ferme: 4 }
    const ao = order[a.deadline.statut]
    const bo = order[b.deadline.statut]
    if (ao !== bo) return ao - bo
    if (a.daysUntil !== null && b.daysUntil !== null) return a.daysUntil - b.daysUntil
    return 0
  })
}

export function getUpcomingDeadlines(data: AapData, withinDays: number): FlatDeadline[] {
  const flat = getFlatDeadlines(data)
  return flat.filter(
    (f) =>
      f.daysUntil !== null &&
      f.daysUntil >= 0 &&
      f.daysUntil <= withinDays &&
      f.deadline.statut !== 'ferme'
  )
}
