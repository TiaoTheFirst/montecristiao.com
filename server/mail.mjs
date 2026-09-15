import { reserveMailAttempt } from './mail-budget.mjs';

// Delivery is separate from authentication. Production sends never write an OTP
// into the fictional local mailbox, and never fall back to it on provider errors.
export function productionMailReady(env) {
  if (env.APP_MODE !== 'production' || env.MAIL_ENABLED !== 'true') return false;
  if (!/^[a-z0-9._+-]+@(?:mail\.)?montecristiao\.com$/i.test(env.MAIL_FROM || '')) return false;
  return env.MAIL_MODE === 'cloudflare'
    ? typeof env.EMAIL?.send === 'function'
    : env.MAIL_MODE === 'resend' && typeof env.RESEND_API_KEY === 'string' && env.RESEND_API_KEY.length >= 16;
}

export async function sendVerificationMail(env, {email, otp, type}, fetcher = fetch) {
  if (!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(email || '') ||
      !/^\d{6}$/.test(otp || '') || !['sign-in','email-verification','change-email'].includes(type)) {
    throw new Error('MAIL_INPUT_INVALID');
  }
  if (env.APP_MODE === 'local-test' && env.MAIL_MODE === 'local-test' && /^[^\s@]+@example\.test$/i.test(email)) {
    await env.DB.prepare('DELETE FROM local_mail WHERE expires_at < ? OR (email = ? AND type = ?)')
      .bind(Date.now(),email,type).run();
    await env.DB.prepare('INSERT INTO local_mail (id,email,otp,type,expires_at) VALUES (?,?,?,?,?)')
      .bind(crypto.randomUUID(),email,otp,type,Date.now()+300000).run();
    return;
  }
  if (!productionMailReady(env) || /@example\.test$/i.test(email)) throw new Error('MAIL_NOT_READY');
  await reserveMailAttempt(env);
  const message = {
    from:env.MAIL_FROM, to:email, subject:'蒙特克里斯条府 · 邮箱验证码',
    text:`本次邮箱验证码：${otp}\n\n五分钟内有效，请勿转发给其他人。若不是您发起的操作，请忽略这封邮件。`,
  };
  if (env.MAIL_MODE === 'cloudflare') {
    try {
      const result = await env.EMAIL.send(message);
      if (!result?.messageId) throw new Error('MAIL_DELIVERY_FAILED');
    } catch { throw new Error('MAIL_DELIVERY_FAILED'); }
    return;
  }
  let response;
  try {
    response = await fetcher('https://api.resend.com/emails', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY.trim()}`, 'Content-Type':'application/json'},
      body:JSON.stringify(message),
    });
  } catch { throw new Error('MAIL_TRANSPORT_FAILED'); }
  if ([401,403].includes(response.status)) throw new Error('MAIL_PROVIDER_AUTH');
  if (!response.ok) throw new Error('MAIL_PROVIDER_REJECTED');
  try { if (!(await response.json())?.id) throw new Error(); }
  catch { throw new Error('MAIL_DELIVERY_FAILED'); }
}
