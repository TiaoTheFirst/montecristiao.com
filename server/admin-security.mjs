import { createRemoteJWKSet, jwtVerify } from "jose";
import { isOwner } from "./service-state.mjs";

export const ADMIN_SESSION_MS = 2 * 60 * 60 * 1000;
const keySets = new Map();

export async function verifyAccessAssertion(token, env, testKeys) {
  const issuer = env.ADMIN_ACCESS_ISSUER, audience = env.ADMIN_ACCESS_AUD;
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || "") ||
      !/^[a-f0-9]{64}$/.test(audience || "") || !token || token.length > 16384)
    throw Error("ACCESS_CONFIGURATION_OR_TOKEN_INVALID");
  if (!testKeys && !keySets.has(issuer))
    keySets.set(issuer, createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs"), { timeoutDuration: 5000 }));
  const { payload } = await jwtVerify(token, testKeys || keySets.get(issuer), {
    algorithms: ["RS256"], issuer, audience, maxTokenAge: "2h",
    requiredClaims: ["exp", "iat", "sub", "email"],
  });
  if (typeof payload.email !== "string" || payload.email.toLowerCase() !== env.OWNER_EMAIL?.toLowerCase())
    throw Error("ACCESS_IDENTITY_MISMATCH");
  return payload;
}

// Shared by the unified administration API and the legacy feedback desk.
// The database cutoff survives unlock; old website sessions cannot regain admin access.
export async function adminSecurity(req, env, session) {
  if (!isOwner(env, session)) return { status: 403, error: "OWNER_ONLY" };
  if (req.headers.get("x-manor-account") !== session.user.id)
    return { status: 409, error: "ACCOUNT_CHANGED" };
  const state = await env.DB.prepare("SELECT locked,revoked_before FROM admin_security WHERE id=1").first();
  if (!state || state.locked !== 0) return { status: 503, error: "ADMIN_LOCKED" };
  const created = new Date(session.session?.createdAt).getTime(), now = Date.now();
  if (!Number.isFinite(created) || created > now || created <= state.revoked_before || now - created >= ADMIN_SESSION_MS)
    return { status: 401, error: "ADMIN_REAUTH_REQUIRED" };
  if (!["pending", "required"].includes(env.ADMIN_ACCESS_MODE))
    return { status: 503, error: "ADMIN_SECURITY_NOT_CONFIGURED" };
  if (env.ADMIN_ACCESS_MODE === "required") {
    try { await verifyAccessAssertion(req.headers.get("cf-access-jwt-assertion"), env); }
    catch { return { status: 403, error: "ADMIN_ACCESS_REQUIRED" }; }
  }
  return null;
}
