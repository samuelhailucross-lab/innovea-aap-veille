'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AapData, Guichet, Deadline, Candidat, Statut } from '@/lib/types'
import { AIRES, Aire, inferAires } from '@/lib/filters'

interface Props {
  data: AapData
}

const STATUT_OPTIONS: { id: Statut; label: string }[] = [
  { id: 'ouvert', label: 'Ouvert' },
  { id: 'ouvert_continu', label: 'En continu' },
  { id: 'a_surveiller', label: 'À surveiller' },
  { id: 'ferme', label: 'Fermé' },
]

const SOURCE_LABELS: Record<Candidat['source'], string> = {
  'EU-FT': 'Portail Funding & Tenders (UE)',
  page: 'Page du guichet modifiée',
  liens: 'Nouveau lien détecté',
}

function isExpired(dl: Deadline): boolean {
  if (dl.statut !== 'ouvert' || !dl.date) return false
  const today = new Date().toISOString().split('T')[0]
  return dl.date < today
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function isSoon(d: string | null | undefined): boolean {
  if (!d) return false
  const days = (parseISO(d).getTime() - Date.now()) / 86400000
  return days > -1 && days <= 30
}

function formatDate(d: string | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!d) return ''
  const p = parseISO(d)
  return isValid(p) ? format(p, pattern, { locale: fr }) : d
}

const EMPTY_DEADLINE: Deadline = { label: '', date: '', statut: 'ouvert', notes: '' }

const CSS = `
.adm { min-height: 100vh; padding-bottom: 96px; }
.adm-header { background: var(--petrol-deep); color: #fff; }
.adm-header-inner { max-width: 960px; margin: 0 auto; padding: 22px 24px 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.adm-owner { margin: 0 0 2px; font-size: 13px; color: #A9DADA; }
.adm-title { margin: 0; font-size: 24px; line-height: 1.2; font-weight: 600; letter-spacing: -0.01em; }
.adm-back { color: #fff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 7px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.35); }
.adm-back:hover { background: rgba(255,255,255,0.1); }

.adm-main { max-width: 960px; margin: 0 auto; padding: 24px; display: grid; gap: 32px; }
.adm-intro { margin: 0; font-size: 14px; color: var(--muted); max-width: 70ch; }

.adm-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.adm-section-head h2 { margin: 0; font-size: 18px; font-weight: 600; }
.adm-section-head p { margin: 0; font-size: 13px; color: var(--muted); }
.adm-count { display: inline-block; min-width: 22px; padding: 0 7px; margin-left: 6px; border-radius: 999px; background: var(--petrol-deep); color: #fff; font-size: 12px; font-weight: 700; line-height: 20px; text-align: center; vertical-align: 2px; }

.adm-queue { display: grid; gap: 10px; }
.adm-cand { background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--petrol); border-radius: 8px; padding: 14px 16px; display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 16px; }
.adm-cand.is-change { border-left-color: #9FB2B3; }
.adm-cand.is-urgent { border-left-color: var(--orange); }
.adm-cand-name { font-weight: 600; font-size: 15px; }
.adm-cand-meta { font-size: 13px; color: var(--muted); margin-top: 3px; display: flex; flex-wrap: wrap; gap: 6px 12px; }
.adm-cand-meta strong { color: var(--ink); font-weight: 600; }
.adm-cand.is-urgent .adm-cand-meta strong { color: var(--orange-text); }
.adm-cand-desc { font-size: 13px; margin: 8px 0 0; }
.adm-cand-src { font-size: 12px; color: var(--muted); margin-top: 8px; }
.adm-cand-src a { color: var(--petrol-deep); font-weight: 600; }
.adm-cand-actions { display: grid; gap: 6px; align-content: start; }
.adm-empty { background: var(--surface); border: 1px dashed var(--line); border-radius: 8px; padding: 18px 16px; font-size: 14px; color: var(--muted); }

.adm-btn { font-size: 13px; font-weight: 600; padding: 7px 12px; border-radius: 6px; border: 1px solid transparent; }
.adm-btn.primary { background: var(--petrol); color: #fff; }
.adm-btn.primary:hover { background: var(--petrol-deep); }
.adm-btn.secondary { background: var(--surface); color: var(--ink); border-color: var(--line); }
.adm-btn.secondary:hover { border-color: #B9C7C8; }
.adm-btn.danger { background: var(--surface); color: #A3261A; border-color: #F0CFCB; }
.adm-btn.danger:hover { background: #FBF0EF; }
.adm-btn.link { background: none; border: none; padding: 0; color: var(--petrol-deep); text-decoration: underline; text-underline-offset: 3px; }
.adm-btn:disabled { opacity: 0.6; cursor: default; }

.adm-control { width: 100%; padding: 7px 9px; border: 1px solid var(--line); border-radius: 6px; font-size: 14px; background: var(--surface); color: var(--ink); }
.adm-control:focus { border-color: var(--petrol); outline: none; box-shadow: 0 0 0 3px var(--petrol-tint); }
.adm-label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }

.adm-list { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.adm-g { border-top: 1px solid var(--line); }
.adm-g:first-child { border-top: none; }
.adm-g-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: none; border: none; text-align: left; color: inherit; font: inherit; }
.adm-g-head:hover { background: #F8FBFB; }
.adm-g-name { font-weight: 600; font-size: 15px; }
.adm-g-sub { font-size: 13px; color: var(--muted); margin-top: 2px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.adm-niveau { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--ink); background: var(--bg); }
.adm-chevron { color: var(--muted); font-size: 13px; transition: transform .15s; flex-shrink: 0; }
.adm-g.is-open .adm-chevron { transform: rotate(180deg); }
.adm-g-body { padding: 4px 16px 20px; background: #F8FBFB; border-top: 1px solid var(--line); }
.adm-block { margin-top: 16px; }
.adm-block h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; }
.adm-aires { display: flex; gap: 6px 18px; flex-wrap: wrap; }
.adm-check { display: flex; align-items: center; gap: 7px; font-size: 14px; cursor: pointer; }
.adm-check input { accent-color: var(--petrol); width: 15px; height: 15px; margin: 0; }
.adm-hint { font-size: 12px; color: var(--muted); margin: 6px 0 0; }

.adm-dl { display: grid; grid-template-columns: minmax(0, 1.3fr) 150px 140px minmax(0, 1.4fr) 34px; gap: 8px; align-items: start; margin-bottom: 10px; }
.adm-dl-new { background: var(--surface); border: 1px dashed #B9C7C8; border-radius: 8px; padding: 12px; margin-top: 4px; }
.adm-remove { width: 34px; height: 34px; margin-top: 20px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-size: 16px; line-height: 1; }
.adm-remove:hover { color: #A3261A; border-color: #F0CFCB; }
.adm-expired { font-size: 11px; color: var(--muted); display: block; margin-top: 3px; }
.adm-foot-note { font-size: 12px; color: var(--muted); margin: 18px 0 0; }

.adm-bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 1px solid var(--line); box-shadow: 0 -4px 16px rgba(23,41,43,0.06); z-index: 10; }
.adm-bar-inner { max-width: 960px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.adm-bar-status { font-size: 14px; color: var(--muted); }
.adm-bar-status.is-dirty { color: var(--orange-text); font-weight: 600; }
.adm-bar-status.is-ok { color: var(--petrol-deep); font-weight: 600; }
.adm-bar-status.is-error { color: #A3261A; font-weight: 600; }
.adm-save { font-size: 14px; padding: 9px 18px; }

@media (max-width: 760px) {
  .adm-cand { grid-template-columns: 1fr; }
  .adm-dl { grid-template-columns: 1fr 1fr; }
  .adm-dl > .adm-dl-label, .adm-dl > .adm-dl-notes { grid-column: 1 / -1; }
  .adm-remove { margin-top: 0; }
  .adm-main { padding: 16px; }
  .adm-header-inner, .adm-bar-inner { padding-left: 16px; padding-right: 16px; }
  .adm-title { font-size: 20px; }
}
`

export default function AdminClient({ data }: Props) {
  const [guichets, setGuichets] = useState<Guichet[]>(data.guichets)
  const [candidats, setCandidats] = useState<Candidat[]>(data.candidats || [])
  const [traites, setTraites] = useState<string[]>(data.traites || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDeadline, setShowAddDeadline] = useState<string | null>(null)
  const [newDeadline, setNewDeadline] = useState<Deadline>(EMPTY_DEADLINE)
  const [cibleGuichet, setCibleGuichet] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const snapshot = (gs: Guichet[], cs: Candidat[], ts: string[]) => JSON.stringify({ gs, cs, ts })
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(data.guichets, data.candidats || [], data.traites || []))
  const current = useMemo(() => snapshot(guichets, candidats, traites), [guichets, candidats, traites])
  const dirty = current !== savedSnapshot

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

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
          : { ...g, deadlines: g.deadlines.map((dl, i) => (i !== dlIndex ? dl : { ...dl, [field]: value || null })) }
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
    setGuichets((gs) => gs.map((g) => (g.id !== guichetId ? g : { ...g, deadlines: g.deadlines.filter((_, i) => i !== dlIndex) })))
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
                { label: newDeadline.label, date: newDeadline.date || null, statut: newDeadline.statut, notes: newDeadline.notes || undefined },
              ],
            }
      )
    )
    setShowAddDeadline(null)
    setNewDeadline(EMPTY_DEADLINE)
  }

  async function saveAll() {
    setSaving(true)
    setSaveError(null)
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
      setSavedSnapshot(current)
      setSavedAt(format(new Date(), 'HH:mm'))
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  let barStatus: { text: string; cls: string }
  if (saveError) barStatus = { text: `Échec de l'enregistrement : ${saveError}`, cls: 'is-error' }
  else if (dirty) barStatus = { text: 'Modifications non enregistrées', cls: 'is-dirty' }
  else if (savedAt) barStatus = { text: `Enregistré à ${savedAt}. Le dashboard sera à jour dans environ une minute.`, cls: 'is-ok' }
  else barStatus = { text: 'Aucune modification en cours', cls: '' }

  const nouveaux = candidats.filter((c) => c.kind === 'nouveau').length

  return (
    <div className="adm">
      <style>{CSS}</style>

      <header className="adm-header">
        <div className="adm-header-inner">
          <div>
            <p className="adm-owner">INNOVÉA, Siemens Healthineers France</p>
            <h1 className="adm-title">Administration de la veille</h1>
          </div>
          <a href="/" className="adm-back">Voir le dashboard</a>
        </div>
      </header>

      <main className="adm-main">
        <p className="adm-intro">
          Les changements faits ici sont publiés sur le dashboard quand vous cliquez sur « Enregistrer et publier ».
          {data.meta.lastScan && <> Dernier scan automatique le {formatDate(data.meta.lastScan, 'd MMMM yyyy')}.</>}
        </p>

        <section aria-labelledby="queue-title">
          <div className="adm-section-head">
            <h2 id="queue-title">
              À valider
              {candidats.length > 0 && <span className="adm-count">{candidats.length}</span>}
            </h2>
            <p>Trouvés par le scan du lundi. Rien n'apparaît sur le dashboard avant validation.</p>
          </div>

          {candidats.length === 0 ? (
            <div className="adm-empty">Rien à valider. Le prochain scan a lieu lundi à 6 h.</div>
          ) : (
            <div className="adm-queue">
              {candidats.map((c) => (
                <article key={c.id} className={`adm-cand${c.kind === 'modifie' ? ' is-change' : ''}${isSoon(c.deadline) ? ' is-urgent' : ''}`}>
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-cand-name">{c.nom}</div>
                    <div className="adm-cand-meta">
                      <span className="adm-niveau">{c.niveau}</span>
                      <span>{c.organisme}</span>
                      {c.callId && <span>{c.callId}</span>}
                      {c.deadline ? <strong>Clôture le {formatDate(c.deadline, 'd MMMM yyyy')}</strong> : <span>Pas de date</span>}
                    </div>
                    {c.description && <p className="adm-cand-desc">{c.description}</p>}
                    <div className="adm-cand-src">
                      {SOURCE_LABELS[c.source]}, détecté le {formatDate(c.detectedAt)}.{' '}
                      <a href={c.url} target="_blank" rel="noopener noreferrer">Ouvrir la source</a>
                    </div>
                  </div>
                  <div className="adm-cand-actions">
                    {c.kind === 'nouveau' ? (
                      <>
                        <label className="adm-label" htmlFor={`cible-${c.id}`}>Ajouter comme</label>
                        <select
                          id={`cible-${c.id}`}
                          className="adm-control"
                          value={cibleGuichet[c.id] || ''}
                          onChange={(e) => setCibleGuichet({ ...cibleGuichet, [c.id]: e.target.value })}
                        >
                          <option value="">Nouveau guichet</option>
                          {guichets.map((g) => (
                            <option key={g.id} value={g.id}>Échéance de : {g.nom}</option>
                          ))}
                        </select>
                        <button type="button" className="adm-btn primary" onClick={() => validerCandidat(c)}>Valider</button>
                        <button type="button" className="adm-btn danger" onClick={() => closeCandidat(c)}>Rejeter</button>
                      </>
                    ) : (
                      <>
                        {c.guichetId && (
                          <button type="button" className="adm-btn secondary" onClick={() => setEditingId(c.guichetId!)}>Modifier le guichet</button>
                        )}
                        <button type="button" className="adm-btn secondary" onClick={() => closeCandidat(c)}>Marquer comme vu</button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="guichets-title">
          <div className="adm-section-head">
            <h2 id="guichets-title">Guichets</h2>
            <p>{guichets.length} suivis{nouveaux > 0 ? `, ${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''} en attente ci-dessus` : ''}</p>
          </div>

          <div className="adm-list">
            {guichets.map((g) => {
              const open = editingId === g.id
              const nextDated = g.deadlines
                .filter((d) => d.date && d.statut !== 'ferme' && !isExpired(d))
                .map((d) => d.date!)
                .sort()[0]
              return (
                <div key={g.id} className={`adm-g${open ? ' is-open' : ''}`}>
                  <button type="button" className="adm-g-head" aria-expanded={open} onClick={() => setEditingId(open ? null : g.id)}>
                    <div style={{ minWidth: 0 }}>
                      <div className="adm-g-name">{g.nom}</div>
                      <div className="adm-g-sub">
                        <span className="adm-niveau">{g.niveau}</span>
                        <span>{g.organisme}</span>
                        <span>
                          {g.deadlines.length} échéance{g.deadlines.length > 1 ? 's' : ''}
                          {nextDated ? `, prochaine le ${formatDate(nextDated)}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="adm-chevron" aria-hidden="true">▾</span>
                  </button>

                  {open && (
                    <div className="adm-g-body">
                      <div className="adm-block">
                        <h3>Aires thérapeutiques</h3>
                        <div className="adm-aires">
                          {AIRES.map((a) => (
                            <label key={a.id} className="adm-check">
                              <input type="checkbox" checked={(g.aires || []).includes(a.id)} onChange={() => toggleAire(g.id, a.id)} />
                              {a.label}
                            </label>
                          ))}
                        </div>
                        <p className="adm-hint">Sans case cochée, le guichet est transverse et s'affiche pour toutes les aires.</p>
                      </div>

                      <div className="adm-block">
                        <h3>Échéances</h3>
                        {g.deadlines.map((dl, i) => (
                          <div key={i} className="adm-dl">
                            <div className="adm-dl-label">
                              <label className="adm-label" htmlFor={`l-${g.id}-${i}`}>Vague</label>
                              <input id={`l-${g.id}-${i}`} className="adm-control" value={dl.label} onChange={(e) => updateDeadline(g.id, i, 'label', e.target.value)} />
                            </div>
                            <div>
                              <label className="adm-label" htmlFor={`d-${g.id}-${i}`}>Clôture</label>
                              <input id={`d-${g.id}-${i}`} type="date" className="adm-control" value={dl.date ?? ''} onChange={(e) => updateDeadline(g.id, i, 'date', e.target.value)} />
                            </div>
                            <div>
                              <label className="adm-label" htmlFor={`s-${g.id}-${i}`}>Statut</label>
                              <select id={`s-${g.id}-${i}`} className="adm-control" value={dl.statut} onChange={(e) => updateDeadline(g.id, i, 'statut', e.target.value)}>
                                {STATUT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                              </select>
                              {isExpired(dl) && <span className="adm-expired">Date passée : affiché « Fermé »</span>}
                            </div>
                            <div className="adm-dl-notes">
                              <label className="adm-label" htmlFor={`n-${g.id}-${i}`}>Notes</label>
                              <input id={`n-${g.id}-${i}`} className="adm-control" value={dl.notes ?? ''} onChange={(e) => updateDeadline(g.id, i, 'notes', e.target.value)} />
                            </div>
                            <button type="button" className="adm-remove" aria-label={`Supprimer l'échéance ${dl.label}`} title="Supprimer cette échéance" onClick={() => removeDeadline(g.id, i)}>×</button>
                          </div>
                        ))}

                        {showAddDeadline === g.id ? (
                          <div className="adm-dl-new">
                            <div className="adm-dl" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) 150px 140px minmax(0, 1.4fr)' }}>
                              <div className="adm-dl-label">
                                <label className="adm-label" htmlFor={`nl-${g.id}`}>Vague (obligatoire)</label>
                                <input id={`nl-${g.id}`} className="adm-control" value={newDeadline.label} onChange={(e) => setNewDeadline({ ...newDeadline, label: e.target.value })} autoFocus />
                              </div>
                              <div>
                                <label className="adm-label" htmlFor={`nd-${g.id}`}>Clôture</label>
                                <input id={`nd-${g.id}`} type="date" className="adm-control" value={newDeadline.date ?? ''} onChange={(e) => setNewDeadline({ ...newDeadline, date: e.target.value })} />
                              </div>
                              <div>
                                <label className="adm-label" htmlFor={`ns-${g.id}`}>Statut</label>
                                <select id={`ns-${g.id}`} className="adm-control" value={newDeadline.statut} onChange={(e) => setNewDeadline({ ...newDeadline, statut: e.target.value as Statut })}>
                                  {STATUT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                              </div>
                              <div className="adm-dl-notes">
                                <label className="adm-label" htmlFor={`nn-${g.id}`}>Notes</label>
                                <input id={`nn-${g.id}`} className="adm-control" value={newDeadline.notes ?? ''} onChange={(e) => setNewDeadline({ ...newDeadline, notes: e.target.value })} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" className="adm-btn primary" disabled={!newDeadline.label} onClick={() => addDeadline(g.id)}>Ajouter l'échéance</button>
                              <button type="button" className="adm-btn secondary" onClick={() => { setShowAddDeadline(null); setNewDeadline(EMPTY_DEADLINE) }}>Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="adm-btn link" onClick={() => setShowAddDeadline(g.id)}>Ajouter une échéance</button>
                        )}
                      </div>

                      <p className="adm-foot-note">
                        Le nom, l'URL et la description se modifient dans <code>data/aap-data.json</code> sur GitHub.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <div className="adm-bar" role="region" aria-label="Enregistrement">
        <div className="adm-bar-inner">
          <span className={`adm-bar-status ${barStatus.cls}`} aria-live="polite">{barStatus.text}</span>
          <button type="button" className="adm-btn primary adm-save" onClick={saveAll} disabled={saving || !dirty}>
            {saving ? 'Enregistrement…' : 'Enregistrer et publier'}
          </button>
        </div>
      </div>
    </div>
  )
}
