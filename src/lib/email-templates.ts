import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const EMAIL_FROM = process.env.EMAIL_FROM || 'ESN Office <onboarding@resend.dev>'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

interface ReservationEmailData {
  reservedByName: string
  startTime: string
  endTime: string
  reason?: string | null
  additionalVolunteerNames?: string[]
}

function buildReservationHtml(
  type: 'created' | 'updated' | 'cancelled',
  data: ReservationEmailData
): { subject: string; html: string } {
  const { reservedByName, startTime, endTime, reason, additionalVolunteerNames } = data

  const startFormatted = formatDateTime(startTime)
  const endFormatted = formatTime(endTime)

  const titles = {
    created: 'ESN Office Reservation Created',
    updated: 'ESN Office Reservation Updated',
    cancelled: 'ESN Office Reservation Cancelled',
  }

  const subject = `${titles[type]}: ${startFormatted}`

  const buddiesHtml =
    additionalVolunteerNames && additionalVolunteerNames.length > 0
      ? `<li><strong>Additional volunteers:</strong> ${additionalVolunteerNames.join(', ')}</li>`
      : ''

  const cancelledNote =
    type === 'cancelled'
      ? `<p style="color:#dc2626;">This reservation has been cancelled.</p>`
      : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#2563eb;">${titles[type]}</h2>
      ${cancelledNote}
      <p>${type === 'cancelled' ? 'The following reservation has been cancelled:' : 'You have been assigned to an office reservation:'}</p>
      <ul style="list-style:none;padding:0;">
        <li><strong>Reserved by:</strong> ${reservedByName}</li>
        <li><strong>Start:</strong> ${startFormatted}</li>
        <li><strong>End:</strong> ${endFormatted}</li>
        ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
        ${buddiesHtml}
      </ul>
      <p style="color:#666;font-size:0.9em;margin-top:20px;">
        This is an automated notification from the ESN Office Management System.
      </p>
    </div>
  `

  return { subject, html }
}

export interface VolunteerRecipient {
  email: string
  name: string
}

export async function sendReservationEmails(
  type: 'created' | 'updated' | 'cancelled',
  recipients: VolunteerRecipient[],
  data: ReservationEmailData
): Promise<{ sent: number; failed: number }> {
  if (recipients.length === 0) return { sent: 0, failed: 0 }

  const { subject, html } = buildReservationHtml(type, data)
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    try {
      await resend.emails.send({ from: EMAIL_FROM, to: [recipient.email], subject, html })
      sent++
    } catch (err) {
      console.error(`Failed to send ${type} email to ${recipient.email}:`, err)
      failed++
    }
  }

  return { sent, failed }
}
