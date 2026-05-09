import crypto from 'node:crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'

let _resend: Resend | undefined
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is required')
    _resend = new Resend(key)
  }
  return _resend
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

function buildOTPEmailHTML(otp: string, type: string): string {
  const action = type === 'email_verify' ? 'Email Verification' : 'Password Reset'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${action}</title>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo-text { font-family: 'Sora', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #4F46E5; }
    .heading { text-align: center; font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .subheading { text-align: center; font-size: 14px; color: #6B7280; margin-bottom: 28px; }
    .otp-box { background: #F3F4F6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-family: 'SF Mono', 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #4F46E5; letter-spacing: 8px; }
    .expiry { text-align: center; font-size: 13px; color: #EF4444; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><div class="logo-text">EduTask</div></div>
    <div class="heading">${action}</div>
    <div class="subheading">Use the code below to complete the process. This code will expire in 5 minutes.</div>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <div class="expiry">Expires in 5 minutes</div>
    <div class="footer">
      Didn't request this? You can safely ignore this email.<br>
      EduTask — Bangladesh's Student Task Marketplace
    </div>
  </div>
</body>
</html>`
}

export async function sendEmailVerificationOTP(userId: string, email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const otp = generateOTP()

  // Invalidate existing unused OTPs
  await supabaseAdmin
    .from('otp_codes')
    .update({ used: true })
    .eq('email', normalizedEmail)
    .eq('type', 'email_verify')
    .eq('used', false)

  const { error: insertError } = await supabaseAdmin.from('otp_codes').insert({
    user_id: userId,
    email: normalizedEmail,
    otp,
    type: 'email_verify',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false,
    attempts: 0,
  })

  if (insertError) {
    return { success: false, error: 'Failed to create OTP' }
  }

  try {
    console.log('Sending email to:', normalizedEmail)
    console.log('OTP code:', otp)
    console.log('*** FOR TESTING: OTP CODE IS:', otp, '***')
    
    // Temporarily bypass email sending for testing
    // const result = await getResend().emails.send({
    //   from: 'EduTask <onboarding@resend.dev>',
    //   to: normalizedEmail,
    //   subject: 'Your EduTask Email Verification Code',
    //   html: buildOTPEmailHTML(otp, 'email_verify'),
    // })
    // console.log('Email send result:', result)
    
    return { success: true }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendPasswordResetOTP(userId: string, email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const otp = generateOTP()

  await supabaseAdmin
    .from('otp_codes')
    .update({ used: true })
    .eq('email', normalizedEmail)
    .eq('type', 'password_reset')
    .eq('used', false)

  const { error: insertError } = await supabaseAdmin.from('otp_codes').insert({
    user_id: userId,
    email: normalizedEmail,
    otp,
    type: 'password_reset',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false,
    attempts: 0,
  })

  if (insertError) {
    return { success: false, error: 'Failed to create OTP' }
  }

  try {
    await getResend().emails.send({
      from: 'EduTask <onboarding@resend.dev>',
      to: normalizedEmail,
      subject: 'Your EduTask Password Reset Code',
      html: buildOTPEmailHTML(otp, 'password_reset'),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to send email' }
  }
}

export async function verifyOTP(email: string, otp: string, type: 'email_verify' | 'password_reset') {
  const normalizedEmail = email.toLowerCase().trim()

  const { data, error } = await supabaseAdmin
    .from('otp_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('type', type)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return { valid: false, error: 'OTP not found or expired' }
  }

  // Increment attempts
  const newAttempts = (data.attempts || 0) + 1
  await supabaseAdmin.from('otp_codes').update({ attempts: newAttempts }).eq('id', data.id)

  if (newAttempts >= 5) {
    await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', data.id)
    return { valid: false, error: 'Too many attempts. Please request a new code.', remaining: 0 }
  }

  if (data.otp !== otp) {
    return { valid: false, error: `Invalid OTP. ${5 - newAttempts} attempts remaining.`, remaining: 5 - newAttempts }
  }

  // Mark as used
  await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', data.id)

  return { valid: true, userId: data.user_id }
}
