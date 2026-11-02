'use client'

import { Fragment, useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FlatDeadline, Guichet, Statut } from '@/lib/types'
import { AIRES, Aire, TRL_BANDS, TrlBand, trlMatches } from '@/lib/filters'

const STATUT_LABELS: Record<Statut, string> = {
  ouvert: 'Ouvert',
  ferme: 'Fermé',
  ouvert_continu: 'En continu',
  a_surveiller: 'À surveiller',
}

const DEFAULT_STATUTS: Statut[] = ['ouvert', 'ouvert_continu', 'a_surveiller']
const STATUT_FILTERS: { id: Statut; label: string }[] = [
  { id: 'ouvert', label: 'Ouvert, date connue' },
  { id: 'ouvert_continu', label: 'Ouvert en continu' },
  { id: 'a_surveiller', label: 'À surveiller' },
  { id: 'ferme', label: 'Fermé' },
]

const URGENT_DAYS = 30

function formatDate(d: string | null, pattern = 'd MMM yyyy'): string {
  if (!d) return ''
  const p = parseISO(d)
  return isValid(p) ? format(p, pattern, { locale: fr }) : d
}

function countdown(days: number): string {
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `J-${days}`
}

interface Props {
  flatDeadlines: FlatDeadline[]
  guichets: Guichet[]
  lastUpdated: string
  updatedBy: string
}

const CSS = `
.aap { min-height: 100vh; }
.aap-header { background: var(--petrol-deep); color: #fff; }
.aap-header-inner { max-width: 1280px; margin: 0 auto; padding: 22px 24px 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.aap-owner { margin: 0 0 2px; font-size: 13px; color: #A9DADA; }
.aap-title { margin: 0; font-size: 24px; line-height: 1.2; font-weight: 600; letter-spacing: -0.01em; }
.aap-header-meta { display: flex; align-items: center; gap: 14px; font-size: 13px; color: #CDEAEA; }
.aap-admin { color: #fff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 7px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.35); }
.aap-admin:hover { background: rgba(255,255,255,0.1); }

.aap-main { max-width: 1280px; margin: 0 auto; padding: 24px; }

.aap-next { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 24px; }
.aap-next-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 14px 20px 0; flex-wrap: wrap; }
.aap-next-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.aap-next-head p { margin: 0; font-size: 13px; color: var(--muted); }
.aap-next-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
.aap-next-item { padding: 14px 20px 18px; border-left: 1px solid var(--line); min-width: 0; }
.aap-next-item:first-child { border-left: none; }
.aap-days { font-size: 34px; line-height: 1.1; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; color: var(--petrol-deep); }
.aap-next-item.is-urgent .aap-days { color: var(--orange); }
.aap-next-date { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; margin-top: 2px; }
.aap-next-item.is-urgent .aap-next-date { color: var(--orange-text); }
.aap-next-name { font-size: 14px; font-weight: 600; margin-top: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.aap-next-org { font-size: 12px; color: var(--muted); margin-top: 2px; }
.aap-next-empty { padding: 14px 20px 18px; font-size: 14px; color: var(--muted); }

.aap-layout { display: grid; grid-template-columns: 236px minmax(0, 1fr); gap: 24px; align-items: start; }
.aap-filters { position: sticky; top: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px 16px; display: grid; gap: 20px; }
.aap-filters h2 { margin: 0; font-size: 15px; font-weight: 600; }
.aap-field-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.aap-control { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; font-size: 14px; background: var(--surface); color: var(--ink); }
.aap-control:focus { border-color: var(--petrol); outline: none; box-shadow: 0 0 0 3px var(--petrol-tint); }
.aap-check { display: flex; align-items: center; gap: 8px; font-size: 14px; padding: 3px 0; cursor: pointer; }
.aap-check input { accent-color: var(--petrol); width: 15px; height: 15px; margin: 0; }
.aap-hint { font-size: 12px; color: var(--muted); margin: 4px 0 0; }
.aap-reset { background: none; border: none; padding: 0; color: var(--petrol-deep); font-size: 13px; font-weight: 600; text-align: left; text-decoration: underline; text-underline-offset: 3px; }

.aap-results { min-width: 0; }
.aap-count { font-size: 13px; color: var(--muted); margin: 0 0 10px; }
.aap-table-wrap { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow-x: auto; }
.aap-table { width: 100%; border-collapse: collapse; min-width: 640px; }
.aap-table th { text-align: left; font-size: 12px; font-weight: 600; color: var(--muted); padding: 12px 16px; border-bottom: 1px solid var(--line); }
.aap-table td { padding: 14px 16px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 14px; }
.aap-row { cursor: pointer; }
.aap-row:hover td { background: #F8FBFB; }
.aap-row.is-closed td { color: var(--muted); }
.aap-row.is-open-row td { border-bottom: none; }
.aap-when { white-space: nowrap; font-variant-numeric: tabular-nums; }
.aap-when-date { font-weight: 600; }
.aap-when-days { font-size: 12px; color: var(--muted); }
.aap-when-days.is-urgent { color: var(--orange-text); font-weight: 600; }
.aap-name { font-weight: 600; }
.aap-row.is-closed .aap-name { font-weight: 500; }
.aap-org { font-size: 13px; color: var(--muted); margin-top: 2px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.aap-niveau { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--ink); background: var(--bg); }
.aap-pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.aap-pill.ouvert { background: var(--petrol-tint); color: var(--petrol-deep); }
.aap-pill.ouvert_continu { background: #E8EEF7; color: #2E4A7A; }
.aap-pill.a_surveiller { background: #F4F0E2; color: #6B5718; }
.aap-pill.ferme { background: #EEF1F1; color: #6B7A7B; }

.aap-detail td { background: #F8FBFB; padding: 4px 16px 20px; }
.aap-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 28px; padding-top: 12px; max-width: 900px; }
.aap-detail dt { font-size: 12px; font-weight: 600; color: var(--muted); }
.aap-detail dd { margin: 2px 0 0; font-size: 14px; }
.aap-note { margin: 16px 0 0; padding: 10px 12px; border-left: 3px solid var(--petrol); background: var(--surface); font-size: 13px; max-width: 900px; }
.aap-detail-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
.aap-open { background: var(--petrol); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 6px; }
.aap-open:hover { background: var(--petrol-deep); }
.aap-tag { font-size: 12px; padding: 3px 9px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); color: var(--muted); }
.aap-tag.aire { border-color: #B5DEDE; color: var(--petrol-deep); }

.aap-empty { padding: 40px 16px; text-align: center; color: var(--muted); font-size: 14px; }
.aap-footer { font-size: 12px; color: var(--muted); margin: 20px 0 0; }

@media (max-width: 960px) {
  .aap-next-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .aap-next-item:nth-child(3) { border-left: none; }
  .aap-next-item:nth-child(n+3) { border-top: 1px solid var(--line); }
}
@media (max-width: 760px) {
  .aap-layout { grid-template-columns: 1fr; }
  .aap-filters { position: static; }
  .aap-detail-grid { grid-template-columns: 1fr; }
  .aap-title { font-size: 20px; }
  .aap-main { padding: 16px; }
  .aap-header-inner { padding: 18px 16px; }
}
`

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

  const filtersActive =
    filterNiveau !== 'ALL' || filterTrl !== 'ALL' || filterAires.length > 0 || search !== '' ||
    filterStatuts.length !== DEFAULT_STATUTS.length || !DEFAULT_STATUTS.every((s) => filterStatuts.includes(s))

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

  // Next dated deadlines still to come, across everything (not affected by filters).
  const upcoming = flatDeadlines
    .filter((d) => d.daysUntil !== null && d.daysUntil >= 0 && d.deadline.statut !== 'ferme')
    .sort((a, b) => (a.daysUntil! - b.daysUntil!))
  const nextFour = upcoming.slice(0, 4)
  const urgentCount = upcoming.filter((d) => d.daysUntil! <= URGENT_DAYS).length
  const continuousCount = flatDeadlines.filter((d) => d.deadline.statut === 'ouvert_continu').length

  return (
    <div className="aap">
      <style>{CSS}</style>

      <header className="aap-header">
        <div className="aap-header-inner">
          <div>
            <p className="aap-owner">INNOVÉA, Siemens Healthineers France</p>
            <h1 className="aap-title">Veille des appels à projets MedTech</h1>
          </div>
          <div className="aap-header-meta">
            <span>Mis à jour le {formatDate(lastUpdated, 'd MMMM yyyy')} par {updatedBy}</span>
            <a href="/admin" className="aap-admin">Admin</a>
          </div>
        </div>
      </header>

      <main className="aap-main">
        <section className="aap-next" aria-labelledby="next-title">
          <div className="aap-next-head">
            <h2 id="next-title">Prochaines clôtures</h2>
            <p>
              {urgentCount > 0 ? `${urgentCount} dans les ${URGENT_DAYS} prochains jours` : `Aucune dans les ${URGENT_DAYS} prochains jours`}
              {continuousCount > 0 && `, et ${continuousCount} guichet${continuousCount > 1 ? 's' : ''} ouvert${continuousCount > 1 ? 's' : ''} en continu`}
            </p>
          </div>
          {nextFour.length === 0 ? (
            <p className="aap-next-empty">Aucune date de clôture à venir. Les nouveaux appels trouvés par le scan hebdomadaire arrivent dans l'admin.</p>
          ) : (
            <ol className="aap-next-list">
              {nextFour.map((d) => (
                <li key={`${d.guichetId}-${d.deadline.label}`} className={`aap-next-item${d.daysUntil! <= URGENT_DAYS ? ' is-urgent' : ''}`}>
                  <div className="aap-days">{countdown(d.daysUntil!)}</div>
                  <div className="aap-next-date">{formatDate(d.deadline.date, 'EEEE d MMMM yyyy')}</div>
                  <div className="aap-next-name" title={d.guichetNom}>{d.guichetNom}</div>
                  <div className="aap-next-org">{d.deadline.label}</div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="aap-layout">
          <aside className="aap-filters" aria-label="Filtres">
            <h2>Filtrer</h2>
            <div>
              <label className="aap-field-label" htmlFor="f-search">Recherche</label>
              <input id="f-search" className="aap-control" type="search" placeholder="robotique, imagerie, IA…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className="aap-field-label" htmlFor="f-niveau">Périmètre</label>
              <select id="f-niveau" className="aap-control" value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value as 'ALL' | 'FR' | 'EU')}>
                <option value="ALL">France et Europe</option>
                <option value="FR">France</option>
                <option value="EU">Europe</option>
              </select>
            </div>
            <div>
              <label className="aap-field-label" htmlFor="f-trl">Maturité (TRL)</label>
              <select id="f-trl" className="aap-control" value={filterTrl} onChange={(e) => setFilterTrl(e.target.value as TrlBand)}>
                {TRL_BANDS.map((b) => <option key={b.id} value={b.id}>{b.id === 'ALL' ? 'Tous les TRL' : b.label}</option>)}
              </select>
            </div>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend className="aap-field-label">Aires thérapeutiques</legend>
              {AIRES.map((a) => (
                <label key={a.id} className="aap-check">
                  <input type="checkbox" checked={filterAires.includes(a.id)} onChange={() => setFilterAires(toggle(filterAires, a.id))} />
                  {a.label}
                </label>
              ))}
              <p className="aap-hint">Les guichets transverses restent affichés.</p>
            </fieldset>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend className="aap-field-label">Statut</legend>
              {STATUT_FILTERS.map((st) => (
                <label key={st.id} className="aap-check">
                  <input type="checkbox" checked={filterStatuts.includes(st.id)} onChange={() => setFilterStatuts(toggle(filterStatuts, st.id))} />
                  {st.label}
                </label>
              ))}
            </fieldset>
            {filtersActive && (
              <button type="button" className="aap-reset" onClick={resetFilters}>Effacer les filtres</button>
            )}
          </aside>

          <div className="aap-results">
            <p className="aap-count" aria-live="polite">
              {filtered.length} échéance{filtered.length > 1 ? 's' : ''} sur {flatDeadlines.length}
            </p>
            <div className="aap-table-wrap">
              <table className="aap-table">
                <thead>
                  <tr>
                    <th scope="col">Clôture</th>
                    <th scope="col">Guichet</th>
                    <th scope="col">Vague</th>
                    <th scope="col">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="aap-empty">
                        Aucune échéance ne correspond à ces filtres.{' '}
                        <button type="button" className="aap-reset" onClick={resetFilters}>Effacer les filtres</button>
                      </td>
                    </tr>
                  )}
                  {filtered.map((d, i) => {
                    const rowId = `${d.guichetId}-${i}`
                    const guichet = guichetDetails[d.guichetId]
                    const isExpanded = expandedId === rowId
                    const closed = d.deadline.statut === 'ferme'
                    const upcomingDays = !closed && d.daysUntil !== null && d.daysUntil >= 0 ? d.daysUntil : null
                    return (
                      <Fragment key={rowId}>
                        <tr
                          className={`aap-row${closed ? ' is-closed' : ''}${isExpanded ? ' is-open-row' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : rowId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setExpandedId(isExpanded ? null : rowId)
                            }
                          }}
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
                          <td className="aap-when">
                            {d.deadline.date ? (
                              <>
                                <div className="aap-when-date">{formatDate(d.deadline.date)}</div>
                                {upcomingDays !== null && (
                                  <div className={`aap-when-days${upcomingDays <= URGENT_DAYS ? ' is-urgent' : ''}`}>{countdown(upcomingDays)}</div>
                                )}
                              </>
                            ) : (
                              <div className="aap-when-days">Pas de date</div>
                            )}
                          </td>
                          <td>
                            <div className="aap-name">{d.guichetNom}</div>
                            <div className="aap-org">
                              <span className="aap-niveau">{d.niveau}</span>
                              <span>{d.organisme}</span>
                            </div>
                          </td>
                          <td>{d.deadline.label}</td>
                          <td><span className={`aap-pill ${d.deadline.statut}`}>{STATUT_LABELS[d.deadline.statut]}</span></td>
                        </tr>
                        {isExpanded && guichet && (
                          <tr className="aap-detail">
                            <td colSpan={4}>
                              <dl className="aap-detail-grid">
                                <div>
                                  <dt>Périmètre</dt>
                                  <dd>{guichet.scope || 'Non renseigné'}</dd>
                                </div>
                                <div>
                                  <dt>Pour qui</dt>
                                  <dd>{guichet.cibles.length ? guichet.cibles.join(', ') : 'Non renseigné'}</dd>
                                </div>
                                <div>
                                  <dt>TRL et budget projet</dt>
                                  <dd>TRL {guichet.trl}, {guichet.budget_projet}</dd>
                                </div>
                                <div>
                                  <dt>Type de financement</dt>
                                  <dd>{guichet.type}</dd>
                                </div>
                              </dl>
                              {d.deadline.notes && <p className="aap-note">{d.deadline.notes}</p>}
                              <div className="aap-detail-actions">
                                <a href={guichet.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="aap-open">
                                  Ouvrir la page du guichet
                                </a>
                                {(guichet.aires || []).map((a) => (
                                  <span key={a} className="aap-tag aire">{AIRES.find((x) => x.id === a)?.label}</span>
                                ))}
                                {guichet.tags.map((t) => (
                                  <span key={t} className="aap-tag">{t}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="aap-footer">Restricted © Siemens Healthineers</p>
          </div>
        </div>
      </main>
    </div>
  )
}
