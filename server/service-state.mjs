import { productionMailReady } from "./mail.mjs";

export const validEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@\u0000-\u001f\u007f]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(value);
export function productionReady(env) {
  return (
    env.APP_MODE === "production" &&
    env.ACCOUNTS_OPEN === "true" &&
    env.APP_ORIGIN === "https://montecristiao.com" &&
    !!env.DB &&
    typeof env.BETTER_AUTH_SECRET === "string" &&
    env.BETTER_AUTH_SECRET.length >= 32 &&
    validEmail(env.OWNER_EMAIL) &&
    productionMailReady(env)
  );
}
export const isOwner = (env, session) =>
  !!session?.user?.emailVerified &&
  typeof env.OWNER_EMAIL === "string" &&
  session.user.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase();
