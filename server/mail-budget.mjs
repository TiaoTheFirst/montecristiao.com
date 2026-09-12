// Count attempts before delivery: a timeout may still mean the provider sent
// the email, so failures must not refund quota. No addresses or OTPs are stored.
export async function reserveMailAttempt(env, now = Date.now()) {
  const daily = Number(env.MAIL_DAILY_LIMIT ?? 90);
  const monthly = Number(env.MAIL_MONTHLY_LIMIT ?? 2700);
  if (!Number.isSafeInteger(daily) || daily < 1 || daily > 100 ||
      !Number.isSafeInteger(monthly) || monthly < 1 || monthly > 3000) {
    throw new Error('MAIL_BUDGET_UNAVAILABLE');
  }
  const day = new Date(now).toISOString().slice(0, 10);
  let reserved;
  try {
    // One statement serializes the daily and monthly checks with the increment.
    reserved = await env.DB.prepare(`
      INSERT INTO mail_delivery_budget(day, attempts)
      SELECT ?, 1 WHERE
        (SELECT COALESCE(SUM(attempts), 0) FROM mail_delivery_budget WHERE day >= ? AND day <= ?) < ?
      ON CONFLICT(day) DO UPDATE SET attempts = attempts + 1
        WHERE attempts < ?
      RETURNING attempts
    `).bind(day, day.slice(0, 7) + '-01', day, monthly, daily).first();
  } catch { throw new Error('MAIL_BUDGET_UNAVAILABLE'); }
  if (!reserved) throw new Error('MAIL_BUDGET_EXHAUSTED');
}
