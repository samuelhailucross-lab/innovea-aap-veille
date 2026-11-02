export type Statut =
  | 'ouvert'
  | 'ferme'
  | 'ouvert_continu'
  | 'a_surveiller'

export type Niveau = 'FR' | 'EU'

export interface Deadline {
  label: string
  date: string | null
  statut: Statut
  notes?: string
}

export interface Guichet {
  id: string
  nom: string
  organisme: string
  niveau: Niveau
  type: string
  trl: string
  scope: string
  cibles: string[]
  budget_projet: string
  url: string
  deadlines: Deadline[]
  tags: string[]
  aires?: ('oncologie' | 'cardiologie' | 'stroke' | 'neuro')[] // empty or absent = transverse (all areas)
}

// A call or a page change found by the weekly scanner, waiting for review in /admin.
export interface Candidat {
  id: string
  kind: 'nouveau' | 'modifie'
  source: 'EU-FT' | 'page' | 'liens'
  detectedAt: string
  nom: string
  organisme: string
  niveau: Niveau
  url: string
  deadline: string | null
  callId?: string
  description?: string
  guichetId?: string // for 'modifie': the guichet whose page changed
}

export interface AapData {
  meta: {
    lastUpdated: string
    updatedBy: string
    lastScan?: string
  }
  guichets: Guichet[]
  candidats?: Candidat[]
  traites?: string[] // candidate ids already validated or rejected — never re-proposed
}

export interface FlatDeadline {
  guichetId: string
  guichetNom: string
  organisme: string
  niveau: Niveau
  url: string
  deadline: Deadline
  daysUntil: number | null
}
