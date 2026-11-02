'use client'

import { useState } from 'react'
import { FlatDeadline, Guichet, Statut } from '@/lib/types'
import { AIRES, Aire, TRL_BANDS, TrlBand, trlMatches } from '@/lib/filters'

const DEFAULT_STATUTS: Statut[] = ['ouvert', 'ouvert_continu', 'a_surveiller']
const STATUT_FILTERS: { id: Statut; label: string }[] = [
  { id: 'ouvert', label: 'Ouvert / date connue' },
  { id: 'ouvert_continu', label: 'Ouvert en continu' },
  { id: 'a_surveiller', label: 'À surveiller / prochaine vague' },
  { id: 'ferme', label: 'Fermé' },
]

const labelStyle: React.CSSProperties = { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 6 }
const controlStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white', color: '#374151' }
const checkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', padding: '3px 0', cursor: 'pointer' }

const STATUT_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  ferme: 'Fermé',
  ouvert_continu: 'Continu',
  a_surveiller: 'À surveiller',
}

const STATUT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ouvert: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  ferme: { bg: '#f9fafb', text: '#9ca3af', border: '#e5e7eb' },
  ouvert_continu: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  a_surveiller: { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
}

const NIVEAU_COLORS: Record<string, { bg: string; text: string }> = {
  FR: { bg: '#dbeafe', text: '#1e40af' },
  EU: { bg: '#fce7f3', text: '#9d174d' },
}

function urgencyBadge(days: number | null): React.ReactNode {
  if (days === null) return null
  if (days < 0) return null
  if (days <= 7) return <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 12 }}>🔴 J-{days}</span>
  if (days <= 30) return <span style={{ color: '#d97706', fontWeight: 600, fontSize: 12 }}>🟠 J-{days}</span>
  return <span style={{ color: '#6b7280', fontSize: 12 }}>J-{days}</span>
}

interface Props {
  flatDeadlines: FlatDeadline[]
  guichets: Guichet[]
  lastUpdated: string
  updatedBy: string
}

export default function DashboardClient({ flatDeadlines, guichets, lastUpdated, updatedBy }: Props) {
  const [filterNiveau, setFilterNiveau] = useState<'ALL' | 'FR' | 'EU'>('ALL')
  const [filterTrl, setFilterTrl] = useState<TrlBand>('ALL')
  const [filterAires, setFilterAires] = useState<Aire[]>([])
  const [filterStatuts, setFilterStatuts] = useState<Statut[]>(DEFAULT_STATUTS)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const guichetDetails: Record<string, Guichet> = {}
  for (const g of guichets) guichetDetails[g.id] = g

  function toggle<T>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
  }

  function resetFilters() {
    setFilterNiveau('ALL')
    setFilterTrl('ALL')
    setFilterAires([])
    setFilterStatuts(DEFAULT_STATUTS)
    setSearch('')
  }

  const filtered = flatDeadlines.filter((d) => {
    const g = guichetDetails[d.guichetId]
    if (filterNiveau !== 'ALL' && d.niveau !== filterNiveau) return false
    if (!filterStatuts.includes(d.deadline.statut)) return false
    if (g && !trlMatches(g.trl, filterTrl)) return false
    // A guichet without specific areas is transverse: it fits every area.
    if (filterAires.length && g?.aires?.length && !filterAires.some((a) => g.aires!.includes(a))) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [
        d.guichetNom, d.organisme, d.deadline.label, d.deadline.notes,
        g?.scope, g?.type, ...(g?.tags || []),
        ...(g?.aires || []).map((a) => AIRES.find((x) => x.id === a)?.label),
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const openCount = flatDeadlines.filter(d => d.deadline.statut === 'ouvert').length
  const urgentCount = flatDeadlines.filter(d => d.daysUntil !== null && d.daysUntil >= 0 && d.daysUntil <= 30).length
  const continuousCount = flatDeadlines.filter(d => d.deadline.statut === 'ouvert_continu').length

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#1e3a8a', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#93c5fd', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>INNOVÉA · Siemens Healthineers France</p>
          <h1 style={{ color: 'white', fontSize: 20, margin: 0, fontWeight: 600 }}>Veille AAP MedTech</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#93c5fd' }}>Mis à jour le {lastUpdated} par {updatedBy}</span>
          <a
            href="/admin"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Admin →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Deadlines ouvertes', value: openCount, color: '#15803d', bg: '#f0fdf4' },
            { label: 'Urgentes (≤ 30 jours)', value: urgentCount, color: '#c2410c', bg: '#fff7ed' },
            { label: 'Guichets continus', value: continuousCount, color: '#1d4ed8', bg: '#eff6ff' },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px 20px', border: `1px solid ${s.bg}` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <style>{`
          .aap-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 24px; align-items: start; }
          .aap-sidebar { position: sticky; top: 16px; }
          @media (max-width: 860px) {
            .aap-layout { grid-template-columns: 1fr; }
            .aap-sidebar { position: static; }
          }
        `}</style>
        <div className="aap-layout">
        <aside className="aap-sidebar" style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 16px', display: 'grid', gap: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '0.04em' }}>FILTRES</div>
          <div>
            <label style={labelStyle} htmlFor="f-search">Recherche</label>
            <input id="f-search" type="search" placeholder="robotique, cardio, imagerie…" value={search} onChange={(e) => setSearch(e.target.value)} style={controlStyle} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="f-niveau">Périmètre</label>
            <select id="f-niveau" value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value as any)} style={controlStyle}>
              <option value="ALL">Tous</option>
              <option value="FR">France</option>
              <option value="EU">Europe</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="f-trl">TRL</label>
            <select id="f-trl" value={filterTrl} onChange={(e) => setFilterTrl(e.target.value as TrlBand)} style={controlStyle}>
              {TRL_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Aires thérapeutiques</span>
            {AIRES.map((a) => (
              <label key={a.id} style={checkStyle}>
                <input type="checkbox" checked={filterAires.includes(a.id)} onChange={() => setFilterAires(toggle(filterAires, a.id))} />
                {a.label}
              </label>
            ))}
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>Les guichets transverses restent affichés.</p>
          </div>
          <div>
            <span style={labelStyle}>Statut</span>
            {STATUT_FILTERS.map((st) => (
              <label key={st.id} style={checkStyle}>
                <input type="checkbox" checked={filterStatuts.includes(st.id)} onChange={() => setFilterStatuts(toggle(filterStatuts, st.id))} />
                {st.label}
              </label>
            ))}
          </div>
          <button onClick={resetFilters} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Réinitialiser
          </button>
        </aside>

        <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>{filtered.length} échéance(s) affichée(s)</p>
        {/* Table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Guichet / Organisme', 'Niveau', 'Vague', 'Date', 'Statut', 'Urgence'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 500, letterSpacing: '0.02em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                    Aucun résultat pour ces filtres.
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => {
                const sc = STATUT_COLORS[d.deadline.statut]
                const nc = NIVEAU_COLORS[d.niveau]
                const guichet = guichetDetails[d.guichetId]
                const isExpanded = expandedId === `${d.guichetId}-${i}`

                return (
                  <>
                    <tr
                      key={`${d.guichetId}-${i}`}
                      onClick={() => setExpandedId(isExpanded ? null : `${d.guichetId}-${i}`)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: d.deadline.statut === 'ferme' ? '#fafafa' : 'white',
                        opacity: d.deadline.statut === 'ferme' ? 0.6 : 1,
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, fontSize: 14, color: '#111827', marginBottom: 2 }}>
                          {d.guichetNom}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{d.organisme}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: nc.bg, color: nc.text, padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>
                          {d.niveau}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>
                        {d.deadline.label}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                        {d.deadline.date ?? '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: '3px 10px', borderRadius: 5, fontSize: 12 }}>
                          {STATUT_LABELS[d.deadline.statut]}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {urgencyBadge(d.daysUntil)}
                      </td>
                    </tr>
                    {isExpanded && guichet && (
                      <tr key={`${d.guichetId}-${i}-expand`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td colSpan={6} style={{ padding: '0 16px 16px 16px', background: '#f8fafc' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 0' }}>
                            <div>
                              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scope</p>
                              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{guichet.scope}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TRL · Budget projet</p>
                              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>TRL {guichet.trl} · {guichet.budget_projet}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cibles</p>
                              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{guichet.cibles.join(', ')}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</p>
                              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{guichet.type}</p>
                            </div>
                          </div>
                          {d.deadline.notes && (
                            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                              <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>📌 {d.deadline.notes}</p>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a
                              href={guichet.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ background: '#1e3a8a', color: 'white', padding: '6px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
                            >
                              Accéder au guichet →
                            </a>
                            {(guichet.aires || []).map((a) => (
                              <span key={a} style={{ background: '#ecfeff', color: '#0e7490', padding: '5px 10px', borderRadius: 5, fontSize: 12 }}>
                                {AIRES.find((x) => x.id === a)?.label}
                              </span>
                            ))}
                            {guichet.tags.map((t) => (
                              <span key={t} style={{ background: '#f1f5f9', color: '#64748b', padding: '5px 10px', borderRadius: 5, fontSize: 12 }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        </div>
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16, textAlign: 'right' }}>
          INNOVÉA · Siemens Healthineers France · Restricted © Siemens Healthineers
        </p>
      </div>
    </div>
  )
}
