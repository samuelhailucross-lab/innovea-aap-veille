'use client'

import { useState } from 'react'
import { FlatDeadline, Guichet } from '@/lib/types'

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
  const [filterStatut, setFilterStatut] = useState<'ALL' | 'ouvert' | 'ouvert_continu' | 'a_surveiller' | 'ferme'>('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = flatDeadlines.filter((d) => {
    if (filterNiveau !== 'ALL' && d.niveau !== filterNiveau) return false
    if (filterStatut !== 'ALL' && d.deadline.statut !== filterStatut) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !d.guichetNom.toLowerCase().includes(q) &&
        !d.organisme.toLowerCase().includes(q) &&
        !d.deadline.label.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const openCount = flatDeadlines.filter(d => d.deadline.statut === 'ouvert').length
  const urgentCount = flatDeadlines.filter(d => d.daysUntil !== null && d.daysUntil >= 0 && d.daysUntil <= 30).length
  const continuousCount = flatDeadlines.filter(d => d.deadline.statut === 'ouvert_continu').length

  const guichetDetails: Record<string, Guichet> = {}
  for (const g of guichets) guichetDetails[g.id] = g

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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Rechercher un guichet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['ALL', 'FR', 'EU'] as const).map((n) => (
              <button
                key={n}
                onClick={() => setFilterNiveau(n)}
                style={{
                  padding: '7px 14px', borderRadius: 7, fontSize: 13, border: '1px solid',
                  borderColor: filterNiveau === n ? '#1d4ed8' : '#e5e7eb',
                  background: filterNiveau === n ? '#1d4ed8' : 'white',
                  color: filterNiveau === n ? 'white' : '#374151',
                  fontWeight: filterNiveau === n ? 600 : 400,
                }}
              >
                {n === 'ALL' ? 'Tous niveaux' : n}
              </button>
            ))}
          </div>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as any)}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white', color: '#374151' }}
          >
            <option value="ALL">Tous statuts</option>
            <option value="ouvert">Ouvert</option>
            <option value="ouvert_continu">Continu</option>
            <option value="a_surveiller">À surveiller</option>
            <option value="ferme">Fermé</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16, textAlign: 'right' }}>
          INNOVÉA · Siemens Healthineers France · Restricted © Siemens Healthineers
        </p>
      </div>
    </div>
  )
}
