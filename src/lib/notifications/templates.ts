// HTML email templates — inline CSS only for email client compatibility.
// Each function returns a complete HTML document string.
// All templates use the same base wrapper + brand colors.

const BRAND = '#6c47ff'
const BG = '#f4f4f5'
const CARD = '#ffffff'
const FOOTER_BG = '#f9f9fb'
const TEXT = '#18181b'
const MUTED = '#71717a'
const BORDER = '#e4e4e7'

function base(subject: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BG};padding:40px 0;">
    <tr><td align="center" style="padding:0 20px;">
      <table width="540" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;width:100%;background:${CARD};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:${BRAND};padding:20px 32px;">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">PaintPro</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:${TEXT};font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:${FOOTER_BG};border-top:1px solid ${BORDER};padding:20px 32px;text-align:center;">
            <p style="margin:0;color:${MUTED};font-size:12px;">
              © ${new Date().getFullYear()} PaintPro · You're receiving this because you have an account.<br>
              <a href="https://paintpro.com" style="color:${MUTED};text-decoration:underline;">paintpro.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function cta(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 8px;">
    <tr>
      <td style="background:${BRAND};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:12px 24px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${TEXT};letter-spacing:-0.3px;">${text}</h1>`
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;color:${MUTED};font-size:15px;line-height:1.6;">${text}</p>`
}

function note(text: string): string {
  return `<div style="background:#f4f0ff;border-left:3px solid ${BRAND};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;color:${TEXT};font-size:13px;line-height:1.5;">${text}</p>
  </div>`
}

function hr(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:24px 0;">`
}

// ============================================================
// CONTRACTOR ONBOARDING TEMPLATES
// ============================================================

export function verificationSubmitted(contractorName: string): { subject: string; html: string } {
  const subject = 'Application received — PaintPro'
  const html = base(subject, `
    ${h1('Your application is under review')}
    ${p(`Hi ${contractorName}, thanks for completing your PaintPro contractor application.`)}
    ${p("Our team reviews every application manually. You'll hear back within 1–2 business days. We'll notify you by email and in-app as soon as a decision is made.")}
    ${note('While you wait: make sure your phone number is correct and notifications are enabled so you don\'t miss your approval.')}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">Questions? Reply to this email and we'll help.</p>
  `)
  return { subject, html }
}

export function accountApproved(contractorName: string, note?: string): { subject: string; html: string } {
  const subject = "You're approved — Welcome to PaintPro!"
  const html = base(subject, `
    ${h1('🎉 You\'re verified and live!')}
    ${p(`Congratulations ${contractorName}! Your contractor account is now <strong style="color:${TEXT};">active</strong>.`)}
    ${p("You'll start receiving leads in your service area within 24 hours. Make sure your profile looks great — homeowners check it before accepting quotes.")}
    ${note ? `<div style="background:#f4f0ff;border-left:3px solid ${BRAND};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;"><p style="margin:0;font-size:13px;color:${TEXT};"><strong>Note from our team:</strong> ${note}</p></div>` : ''}
    ${cta('Go to your dashboard', 'https://paintpro.com/contractor')}
    ${hr()}
    ${p('Tips for winning your first job:')}
    <ul style="margin:0 0 16px;padding-left:20px;color:${MUTED};font-size:14px;line-height:2;">
      <li>Respond to leads within the first hour — contractors who do win 3× more jobs</li>
      <li>Upload before/after photos of your best work</li>
      <li>Keep your response rate high by declining leads you can't do instead of ignoring them</li>
    </ul>
  `)
  return { subject, html }
}

export function accountRejected(contractorName: string, reason: string): { subject: string; html: string } {
  const subject = 'Application update — PaintPro'
  const html = base(subject, `
    ${h1('Application not approved')}
    ${p(`Hi ${contractorName}, after reviewing your application we weren't able to approve it at this time.`)}
    ${note(`<strong>Reason:</strong> ${reason}`)}
    ${p("If you believe this is an error or you'd like to address the issue and reapply, please reply to this email with your updated documents.")}
    ${p("We review all appeals promptly and want to help qualified contractors join the platform.")}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">Reply to this email to speak with our team.</p>
  `)
  return { subject, html }
}

export function resubmissionRequested(contractorName: string, note: string): { subject: string; html: string } {
  const subject = 'Action needed — Please resubmit your application'
  const html = base(subject, `
    ${h1('We need a bit more from you')}
    ${p(`Hi ${contractorName}, our team reviewed your application and needs you to update some information before we can approve your account.`)}
    ${`<div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:${TEXT};line-height:1.5;"><strong>What to update:</strong> ${note}</p>
    </div>`}
    ${p("Log in to your contractor dashboard and complete the required changes. Your account remains in review until you resubmit.")}
    ${cta('Update your application', 'https://paintpro.com/contractor')}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">Need help? Reply to this email and we'll walk you through it.</p>
  `)
  return { subject, html }
}

// ============================================================
// LEAD TEMPLATES
// ============================================================

export function newLead(contractorName: string, city: string, jobType: string, leadId: string): { subject: string; html: string } {
  const subject = `New lead in ${city} — PaintPro`
  const html = base(subject, `
    ${h1(`New lead in ${city}`)}
    ${p(`Hi ${contractorName}, a homeowner in <strong style="color:${TEXT};">${city}</strong> needs <strong style="color:${TEXT};">${jobType}</strong> work.`)}
    ${note('You have <strong>24 hours</strong> to respond. Leads that aren\'t actioned expire and go to the next contractor.')}
    ${cta('View lead →', `https://paintpro.com/contractor/leads/${leadId}`)}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">Responding within the first hour dramatically increases your chance of winning the job.</p>
  `)
  return { subject, html }
}

export function leadExpiring(contractorName: string, city: string, leadId: string): { subject: string; html: string } {
  const subject = 'Lead expiring in 2 hours — PaintPro'
  const html = base(subject, `
    ${h1('Your lead expires soon')}
    ${p(`Hi ${contractorName}, your lead in <strong style="color:${TEXT};">${city}</strong> expires in <strong style="color:${TEXT};">2 hours</strong>.`)}
    ${p('After that it goes to the next contractor in line.')}
    ${cta('Quote or decline now →', `https://paintpro.com/contractor/leads/${leadId}`)}
  `)
  return { subject, html }
}

// ============================================================
// QUOTE TEMPLATES
// ============================================================

export function quoteAccepted(contractorName: string, amount: string, jobType: string, jobId: string): { subject: string; html: string } {
  const subject = 'Quote accepted — payment secured!'
  const html = base(subject, `
    ${h1('Your quote was accepted 🎉')}
    ${p(`Hi ${contractorName}, a homeowner accepted your <strong style="color:${TEXT};">$${amount}</strong> quote for <strong style="color:${TEXT};">${jobType}</strong>. Payment is secured and waiting.`)}
    ${p('Reach out to the homeowner through the platform to confirm the start date and any details.')}
    ${cta('View job details →', `https://paintpro.com/contractor/jobs/${jobId}`)}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">Payment is released after the homeowner confirms the work is complete.</p>
  `)
  return { subject, html }
}

export function quoteNotSelected(contractorName: string, jobType: string): { subject: string; html: string } {
  const subject = 'Quote update — PaintPro'
  const html = base(subject, `
    ${h1('The homeowner chose a different contractor')}
    ${p(`Hi ${contractorName}, the homeowner selected another contractor for their <strong style="color:${TEXT};">${jobType}</strong> project.`)}
    ${p('Keep responding quickly to new leads — contractors with fast response rates win more jobs.')}
    ${cta('View your leads →', 'https://paintpro.com/contractor/leads')}
  `)
  return { subject, html }
}

export function newQuoteReceived(homeownerName: string, contractorBusiness: string, amount: string, projectId: string): { subject: string; html: string } {
  const subject = `New quote from ${contractorBusiness} — PaintPro`
  const html = base(subject, `
    ${h1('You have a new quote')}
    ${p(`Hi ${homeownerName}, <strong style="color:${TEXT};">${contractorBusiness}</strong> submitted a quote of <strong style="color:${TEXT};">$${amount}</strong> for your project.`)}
    ${p('Compare quotes from all contractors before accepting. Once you accept, payment is captured securely and held until the work is complete.')}
    ${cta('Review quote →', `https://paintpro.com/homeowner/projects/${projectId}/quotes`)}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">You have 72 hours to review this quote before it expires.</p>
  `)
  return { subject, html }
}

// ============================================================
// JOB TEMPLATES
// ============================================================

export function jobMarkedComplete(homeownerName: string, contractorBusiness: string, amount: string, jobId: string): { subject: string; html: string } {
  const subject = 'Job marked complete — release payment'
  const html = base(subject, `
    ${h1('Your job is complete')}
    ${p(`Hi ${homeownerName}, <strong style="color:${TEXT};">${contractorBusiness}</strong> has marked the job as complete and is requesting payment release.`)}
    ${p(`Review the work, then release <strong style="color:${TEXT};">$${amount}</strong> to the contractor.`)}
    ${note('<strong>You have 72 hours</strong> to review the work or raise a concern. If you take no action, payment is released automatically.')}
    ${cta('Review and release payment →', `https://paintpro.com/homeowner/jobs/${jobId}`)}
  `)
  return { subject, html }
}

export function releaseWarning(homeownerName: string, hoursLeft: number, jobId: string): { subject: string; html: string } {
  const subject = `Payment releases in ${hoursLeft} hours — PaintPro`
  const html = base(subject, `
    ${h1(`${hoursLeft === 6 ? '⚠️ ' : ''}Payment releases in ${hoursLeft} hours`)}
    ${p(`Hi ${homeownerName}, your job payment releases automatically in <strong style="color:${TEXT};">${hoursLeft} hours</strong>.`)}
    ${p(hoursLeft <= 6
      ? 'This is your last opportunity to raise a concern before the dispute window closes permanently.'
      : 'If you have any concerns about the work, now is the time to raise them.'
    )}
    ${cta(hoursLeft <= 6 ? 'Raise a concern now →' : 'Review your job →', `https://paintpro.com/homeowner/jobs/${jobId}`)}
  `)
  return { subject, html }
}

export function paymentReleased(contractorName: string, amount: string, jobId: string): { subject: string; html: string } {
  const subject = 'Payment released — PaintPro'
  const html = base(subject, `
    ${h1('Payment is on its way 💸')}
    ${p(`Hi ${contractorName}, <strong style="color:${TEXT};">$${amount}</strong> has been released to your Stripe account and will arrive in your bank in approximately 2 business days.`)}
    ${cta('View job →', `https://paintpro.com/contractor/jobs/${jobId}`)}
    ${hr()}
    <p style="margin:0;color:${MUTED};font-size:13px;">Keep growing your reputation — a review request was sent to the homeowner.</p>
  `)
  return { subject, html }
}

// ============================================================
// DISPUTE TEMPLATES
// ============================================================

export function disputeRaisedContractor(contractorName: string, reason: string, deadline: string, jobId: string): { subject: string; html: string } {
  const subject = 'Dispute opened on your job — PaintPro'
  const html = base(subject, `
    ${h1('A dispute has been raised')}
    ${p(`Hi ${contractorName}, the homeowner has raised a dispute on your completed job.`)}
    ${`<div style="background:#fef2f2;border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:${TEXT};line-height:1.5;"><strong>Homeowner's reason:</strong> ${reason}</p>
    </div>`}
    ${note(`<strong>Your deadline:</strong> Submit your response and evidence by <strong>${deadline}</strong>. If you don't respond, the dispute is resolved in the homeowner's favor.`)}
    ${cta('Respond to dispute →', `https://paintpro.com/contractor/jobs/${jobId}/dispute`)}
  `)
  return { subject, html }
}

export function disputeRaisedHomeowner(homeownerName: string, jobId: string): { subject: string; html: string } {
  const subject = 'Dispute submitted — PaintPro'
  const html = base(subject, `
    ${h1('Your dispute is under review')}
    ${p(`Hi ${homeownerName}, your dispute has been received. Payment is frozen while our team reviews.`)}
    ${p('The contractor has 48 hours to submit their response. Our team targets a resolution within 24 hours after that.')}
    ${cta('View dispute status →', `https://paintpro.com/homeowner/jobs/${jobId}/dispute`)}
  `)
  return { subject, html }
}

export function disputeResolved(name: string, outcome: 'contractor' | 'homeowner' | 'split', notes: string, jobId: string, isContractor: boolean): { subject: string; html: string } {
  const subject = 'Dispute resolved — PaintPro'
  const outcomeText = outcome === 'contractor'
    ? 'in the contractor\'s favor — full payment released'
    : outcome === 'homeowner'
      ? 'in the homeowner\'s favor — full refund issued'
      : 'with a split settlement'
  const html = base(subject, `
    ${h1('Dispute resolved')}
    ${p(`Hi ${name}, the dispute has been resolved <strong style="color:${TEXT};">${outcomeText}</strong>.`)}
    ${notes ? note(`<strong>Admin notes:</strong> ${notes}`) : ''}
    ${cta(`View ${isContractor ? 'job' : 'job'} →`, `https://paintpro.com/${isContractor ? 'contractor' : 'homeowner'}/jobs/${jobId}`)}
  `)
  return { subject, html }
}

// ============================================================
// REVIEW TEMPLATE
// ============================================================

export function reviewRequest(name: string, otherParty: string, jobType: string, reviewUrl: string): { subject: string; html: string } {
  const subject = `How did it go? Leave a review — PaintPro`
  const html = base(subject, `
    ${h1('How did the job go?')}
    ${p(`Hi ${name}, your <strong style="color:${TEXT};">${jobType}</strong> job with <strong style="color:${TEXT};">${otherParty}</strong> is complete. We'd love to hear how it went.`)}
    ${p('Reviews help keep the platform trustworthy for everyone. You have 14 days to leave one.')}
    ${cta('Leave a review →', reviewUrl)}
  `)
  return { subject, html }
}
