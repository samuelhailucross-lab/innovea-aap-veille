// Client-safe helpers for dashboard filters (no Node imports here).

export type Aire = 'oncologie' | 'cardiologie' | 'stroke' | 'neuro'

export const AIRES: { id: Aire; label: string }[] = [
  { id: 'oncologie', label: 'Oncologie' },
  { id: 'cardiologie', label: 'Cardiologie' },
  { id: 'stroke', label: 'Stroke' },
  { id: 'neuro', label: 'Alzheimer / neuro' },
]

const AIRE_PATTERNS: Record<Aire, RegExp> = {
  oncologie: /cancer|oncolog|tumou?r|radiotherap|theranost|radiopharm/i,
  cardiologie: /cardio|heart|cardiaque|coeur|cœur|vascular/i,
  stroke: /stroke|avc|accident vasculaire|cerebrovascular/i,
  neuro: /alzheimer|neurodegenerat|neurodégénérat|dementia|démence|parkinson|neurolog/i,
}

// Areas named in a call's title or description.
export function inferAires(text: string): Aire[] {
  return AIRES.map((a) => a.id).filter((id) => AIRE_PATTERNS[id].test(text))
}

export type TrlBand = 'ALL' | 'early' | 'mid' | 'late'

export const TRL_BANDS: { id: TrlBand; label: string; lo: number; hi: number }[] = [
  { id: 'ALL', label: 'Tous', lo: 1, hi: 9 },
  { id: 'early', label: 'TRL 1–4 (recherche)', lo: 1, hi: 4 },
  { id: 'mid', label: 'TRL 5–6 (validation)', lo: 5, hi: 6 },
  { id: 'late', label: 'TRL 7–9 (marché)', lo: 7, hi: 9 },
]

// "5-8" overlaps "TRL 5–6" and "TRL 7–9". Unknown TRL ("—") always matches.
export function trlMatches(trl: string, band: TrlBand): boolean {
  if (band === 'ALL') return true
  const nums = (trl.match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 9)
  if (nums.length === 0) return true
  const b = TRL_BANDS.find((x) => x.id === band)!
  return Math.min(...nums) <= b.hi && Math.max(...nums) >= b.lo
}
