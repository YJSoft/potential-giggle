import nodemailer from 'nodemailer'

function createTransport() {
  const provider = process.env.EMAIL_PROVIDER ?? 'smtp'

  if (provider === 'smtp') {
    // Local: MailHog
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      ignoreTLS: true,
    })
  }

  // Production: Azure Communication Services SMTP relay
  return nodemailer.createTransport({
    host: 'smtp.azurecomm.net',
    port: 587,
    secure: false,
    auth: {
      user: process.env.AZURE_COMMUNICATION_SENDER_ADDRESS,
      pass: process.env.AZURE_COMMUNICATION_SMTP_PASSWORD,
    },
  })
}

const transport = createTransport()

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}) {
  const from =
    process.env.AZURE_COMMUNICATION_SENDER_ADDRESS ??
    'noreply@eventhub.local'

  await transport.sendMail({ from, ...opts })
}
