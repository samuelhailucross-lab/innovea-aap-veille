import { Resend } from 'resend'
import { FlatDeadline } from './types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'd MMMM yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}

function urgencyLabel(days: number): string {
  if (days <= 7) return '🔴 URGENT'
  if (days <= 14) return '🟠 Bientôt'
  return '🟡 À préparer'
}

export async function sendMonthlyDigest(
  deadlines: FlatDeadline[],
  recipients: string[]
): Promise<void> {
  const upcoming = deadlines
    .filter((d) => d.daysUntil !== null && d.daysUntil >= 0 && d.deadline.statut !== 'ferme')
    .slice(0, 15)

  const tableRows = upcoming
    .map(
      (d) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 8px; font-size: 14px;">
        <a href="${d.url}" style="color: #1a56db; text-decoration: none; font-weight: 500;">${d.guichetNom}</a>
        <br><span style="color: #6b7280; font-size: 12px;">${d.organisme}</span>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #374151;">${d.deadline.label}</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: center;">
        <span style="background: ${d.niveau === 'FR' ? '#dbeafe' : '#fce7f3'}; color: ${d.niveau === 'FR' ? '#1e40af' : '#9d174d'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${d.niveau}</span>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #374151;">${formatDate(d.deadline.date)}</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: center;">${d.daysUntil !== null ? `${urgencyLabel(d.daysUntil)} (J-${d.daysUntil})` : '—'}</td>
    </tr>`
    )
    .join('')

  const continuousCount = deadlines.filter((d) => d.deadline.statut === 'ouvert_continu').length
  const watchCount = deadlines.filter((d) => d.deadline.statut === 'a_surveiller').length

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    
    <div style="background: #1e40af; padding: 28px 32px;">
      <p style="color: #bfdbfe; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">INNOVÉA · Siemens Healthineers France</p>
      <h1 style="color: white; font-size: 22px; margin: 0; font-weight: 600;">Veille AAP MedTech</h1>
      <p style="color: #93c5fd; font-size: 14px; margin: 8px 0 0;">Digest mensuel · ${format(new Date(), 'MMMM yyyy', { locale: fr })}</p>
    </div>

    <div style="padding: 24px 32px;">
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #1e40af;">${upcoming.length}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">deadlines à venir</div>
        </div>
        <div style="flex: 1; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #15803d;">${continuousCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">guichets continus</div>
        </div>
        <div style="flex: 1; background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #a16207;">${watchCount}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">à surveiller</div>
        </div>
      </div>

      <h2 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 12px;">Deadlines à venir</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 10px 8px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500;">Guichet</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500;">Vague</th>
            <th style="padding: 10px 8px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 500;">Niveau</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500;">Date</th>
            <th style="padding: 10px 8px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 500;">Urgence</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #1e40af;">
        <p style="font-size: 13px; color: #374151; margin: 0;">
          Ce digest est généré automatiquement à partir du fichier <code>aap-data.json</code> maintenu sur GitHub.<br>
          Pour mettre à jour les données ou ajouter un guichet, accédez au dashboard admin.
        </p>
      </div>
    </div>

    <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">INNOVÉA · Siemens Healthineers France · Confidential</p>
    </div>
  </div>
</body>
</html>`

  await resend.emails.send({
    from: 'INNOVÉA AAP Veille <noreply@yourdomain.com>',
    to: recipients,
    subject: `[AAP MedTech] Digest mensuel — ${format(new Date(), 'MMMM yyyy', { locale: fr })}`,
    html,
  })
}
