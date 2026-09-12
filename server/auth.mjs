import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

export function createAuth(env, sendMail) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("AUTH_NOT_CONFIGURED");
  return betterAuth({
    appName: "蒙特克里斯条府",
    baseURL: env.APP_ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.APP_ORIGIN],
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 12,
      freshAge: 300,
      cookieCache: { enabled: false },
    },
    user: { deleteUser: { enabled: true } },
    advanced: {
      useSecureCookies: env.APP_ORIGIN.startsWith("https:"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/email-otp/send-verification-otp": { window: 60, max: 4 },
        "/sign-in/email-otp": { window: 60, max: 10 },
        "/email-otp/request-email-change": { window: 60, max: 3 },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: "hashed",
        resendStrategy: "rotate",
        changeEmail: { enabled: true, verifyCurrentEmail: true },
        async sendVerificationOTP({ email, otp, type }) {
          await sendMail({ email, otp, type });
        },
      }),
    ],
    logger: { disabled: true },
  });
}
