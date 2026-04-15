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
}

export interface AapData {
  meta: {
    lastUpdated: string
    updatedBy: string
  }
  guichets: Guichet[]
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
