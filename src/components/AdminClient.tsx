'use client'

import { useState } from 'react'
import { AapData, Guichet, Deadline, Candidat } from '@/lib/types'
import { AIRES, Aire, inferAires } from '@/lib/filters'

interface Props {
  data: AapData
}

const STATUT_OPTIONS = ['ouvert', 'ouvert_continu', 'a_surveiller', 'ferme'] as const

function isExpired(dl: Deadline): boolean {
  if (dl.statut !== 'ouvert' || !dl.date) return false
  const today = new Date().toISOString().split('T')[0]
  return dl.date < today
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

const SOURCE_LABELS: Record<Candidat['source'], string> = {
  'EU-FT': 'Portail Funding & Tenders (UE)',
  page: 'Page du guichet modifiée',
  liens: 'Nouveau lien détecté',
}

export default function AdminClient({ data }: Props) {
  const [guichets, setGuichets] = useState<Guichet[]>(data.guichets)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAddDeadline, setShowAddDeadline] = useState<string | null>(null)
  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({ label: '', date: '', statut: 'ouvert', notes: '' })
  const [candidats, setCandidats] = useState<Candidat[]>(data.candidats || [])
  const [traites, setTraites] = useState<string[]>(data.traites || [])
  const [cibleGuichet, setCibleGuichet] = useState<Record<string, string>>({})

  function closeCandidat(c: Candidat) {
    setCandidats((cs) => cs.filter((x) => x.id !== c.id))
    setTraites((ts) => (ts.includes(c.id) ? ts : [...ts, c.id]))
  }

  function validerCandidat(c: Candidat) {
    const deadline: Deadline = {
      label: c.callId || 'Appel',
      date: c.deadline,
      statut: c.deadline ? 'ouvert' : 'a_surveiller',
      notes: c.callId && c.callId !== c.nom ? c.nom : undefined,
    }
    const target = cibleGuichet[c.id]
    if (target) {
      // Add as a new deadline on an existing guichet
      setGuichets((gs) => gs.map((g) => (g.id !== target ? g : { ...g, deadlines: [...g.deadlines, deadline] })))
    } else {
      let id = slugify(c.callId || c.nom) || c.id
      while (guichets.some((g) => g.id === id)) id = id + '-2'
      const g: Guichet = {
        id,
        nom: c.nom,
        organisme: c.organisme,
        niveau: c.niveau,
        type: 'À préciser',
        trl: '—',
        scope: c.description || '',
        cibles: [],
        budget_projet: '—',
        url: c.url,
        deadlines: [deadline],
        tags: [],
        aires: inferAires(`${c.nom} ${c.description || ''}`),
      }
      setGuichets((gs) => [...gs, g])
    }
    closeCandidat(c)
  }

  function updateDeadline(guichetId: string, dlIndex: number, field: keyof Deadline, value: string) {
    setGuichets((gs) =>
      gs.map((g) =>
        g.id !== guichetId
          ? g
          : {
              ...g,
              deadlines: g.deadlines.map((dl, i) =>
                i !== dlIndex ? dl : { ...dl, [field]: value || null }
              ),
            }
      )
    )
  }

  function toggleAire(guichetId: string, aire: Aire) {
    setGuichets((gs) =>
      gs.map((g) => {
        if (g.id !== guichetId) return g
        const cur = g.aires || []
        return { ...g, aires: cur.includes(aire) ? cur.filter((a) => a !== aire) : [...cur, aire] }
      })
    )
  }

  function removeDeadline(guichetId: string, dlIndex: number) {
    setGuichets((gs) =>
      gs.map((g) =>
        g.id !== guichetId
          ? g
          : { ...g, deadlines: g.deadlines.filter((_, i) => i !== dlIndex) }
      )
    )
  }

  function addDeadline(guichetId: string) {
    if (!newDeadline.label) return
    setGuichets((gs) =>
      gs.map((g) =>
        g.id !== guichetId
          ? g
          : {
              ...g,
              deadlines: [
                ...g.deadlines,
                {
                  label: newDeadline.label!,
                  date: newDeadline.date || null,
                  statut: (newDeadline.statut as any) || 'ouvert',
                  notes: newDeadline.notes || undefined,
                },
              ],
            }
      )
    )
    setShowAddDeadline(null)
    setNewDeadline({ label: '', date: '', statut: 'ouvert', notes: '' })
  }

  async function saveAll() {
    setSaving(true)
    const payload: AapData = {
      meta: {
        lastUpdated: new Date().toISOString().split('T')[0],
        updatedBy: 'Admin',
        ...(data.meta.lastScan ? { lastScan: data.meta.lastScan } : {}),
      },
      guichets,
      candidats,
      traites,
    }
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      alert(`Échec de la sauvegarde : ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#1e3a8a', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#93c5fd', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>INNOVÉA — Admin</p>
          <h1 style={{ color: 'white', fontSize: 20, margin: 0, fontWeight: 600 }}>Gestion des guichets AAP</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6 }}>
            ← Dashboard
          </a>
          <button
            onClick={saveAll}
            disabled={saving}
            style={{ background: saved ? '#15803d' : '#f59e0b', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 7, fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          « Sauvegarder » publie les modifications sur GitHub ; le dashboard est mis à jour environ 1 minute plus tard.
          {data.meta.lastScan && <> Dernier scan automatique : {data.meta.lastScan}.</>}
        </p>

        {candidats.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '18px 20px', marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#92400e', margin: '0 0 4px' }}>À valider ({candidats.length})</h2>
            <p style={{ fontSize: 12, color: '#a16207', margin: '0 0 14px' }}>
              Trouvés par le scan hebdomadaire. Rien n'apparaît sur le dashboard avant validation. Pensez à « Sauvegarder » ensuite.
            </p>
            {candidats.map((c) => (
              <div key={c.id} style={{ background: 'white', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {c.kind === 'modifie' ? '✎ ' : ''}{c.nom}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {c.organisme} · {c.niveau}{c.callId ? ` · ${c.callId}` : ''} · {c.deadline ? `Clôture ${c.deadline}` : 'Pas de date'}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>{c.description}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                      {SOURCE_LABELS[c.source]} · détecté le {c.detectedAt} ·{' '}
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>Ouvrir la source →</a>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, width: 200 }}>
                    {c.kind === 'nouveau' ? (
                      <>
                        <select
                          value={cibleGuichet[c.id] || ''}
                          onChange={(e) => setCibleGuichet({ ...cibleGuichet, [c.id]: e.target.value })}
                          style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12 }}
                        >
                          <option value="">Nouveau guichet</option>
                          {guichets.map((g) => (
                            <option key={g.id} value={g.id}>Ajouter à : {g.nom}</option>
                          ))}
                        </select>
                        <button onClick={() => validerCandidat(c)} style={{ background: '#15803d', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Valider
                        </button>
                        <button onClick={() => closeCandidat(c)} style={{ background: 'white', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                          Rejeter
                        </button>
                      </>
                    ) : (
                      <>
                        {c.guichetId && (
                          <button onClick={() => setEditingId(c.guichetId!)} style={{ background: 'white', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                            Modifier le guichet
                          </button>
                        )}
                        <button onClick={() => closeCandidat(c)} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                          Marquer comme vu
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {guichets.map((g) => (
          <div key={g.id} style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
            <div
              onClick={() => setEditingId(editingId === g.id ? null : g.id)}
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: editingId === g.id ? '1px solid #e5e7eb' : 'none' }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{g.nom}</span>
                <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>{g.organisme}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  background: g.niveau === 'FR' ? '#dbeafe' : '#fce7f3',
                  color: g.niveau === 'FR' ? '#1e40af' : '#9d174d',
                  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600
                }}>{g.niveau}</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{g.deadlines.length} deadline(s)</span>
                <span style={{ color: '#9ca3af', fontSize: 16 }}>{editingId === g.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {editingId === g.id && (
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aires thérapeutiques</h3>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                  {AIRES.map((a) => (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                      <input type="checkbox" checked={(g.aires || []).includes(a.id)} onChange={() => toggleAire(g.id, a.id)} />
                      {a.label}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 18px' }}>
                  Aucune case cochée = guichet transverse, affiché pour toutes les aires.
                </p>
                <h3 style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadlines</h3>

                {g.deadlines.map((dl, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 160px auto', gap: 8, marginBottom: 10, alignItems: 'start' }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 3 }}>Label</label>
                      <input
                        value={dl.label}
                        onChange={(e) => updateDeadline(g.id, i, 'label', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 3 }}>Date (YYYY-MM-DD)</label>
                      <input
                        value={dl.date ?? ''}
                        onChange={(e) => updateDeadline(g.id, i, 'date', e.target.value)}
                        placeholder="2026-09-15"
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 3 }}>Statut</label>
                      <select
                        value={dl.statut}
                        onChange={(e) => updateDeadline(g.id, i, 'statut', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                      >
                        {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {isExpired(dl) && (
                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginTop: 3 }}>Date passée : affichée « Fermé »</span>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 3 }}>Notes</label>
                      <input
                        value={dl.notes ?? ''}
                        onChange={(e) => updateDeadline(g.id, i, 'notes', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
                      />
                    </div>
                    <div style={{ paddingTop: 18 }}>
                      <button
                        onClick={() => removeDeadline(g.id, i)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {showAddDeadline === g.id ? (
                  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px', marginTop: 12, border: '1px dashed #d1d5db' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 160px', gap: 8, marginBottom: 10 }}>
                      <input placeholder="Label *" value={newDeadline.label} onChange={(e) => setNewDeadline({ ...newDeadline, label: e.target.value })} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                      <input placeholder="2026-09-15" value={newDeadline.date ?? ''} onChange={(e) => setNewDeadline({ ...newDeadline, date: e.target.value })} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                      <select value={newDeadline.statut} onChange={(e) => setNewDeadline({ ...newDeadline, statut: e.target.value as any })} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                        {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input placeholder="Notes (optionnel)" value={newDeadline.notes ?? ''} onChange={(e) => setNewDeadline({ ...newDeadline, notes: e.target.value })} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => addDeadline(g.id)} style={{ background: '#15803d', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>Ajouter</button>
                      <button onClick={() => setShowAddDeadline(null)} style={{ background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 6, fontSize: 13 }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddDeadline(g.id)}
                    style={{ marginTop: 8, background: 'white', color: '#1d4ed8', border: '1px dashed #93c5fd', padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                  >
                    + Ajouter une deadline
                  </button>
                )}

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                    Pour modifier le nom, l'URL ou la description du guichet, éditez directement <code>data/aap-data.json</code> sur GitHub.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
