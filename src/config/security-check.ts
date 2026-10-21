/**
 * Where the Security check's scanner API lives, read from the environment: the local scanner now
 * (`make scanner-serve` in the fraud repo, http://127.0.0.1:8080), Cloud Run behind the site's Worker
 * later. Without it the section uses the presets' cached results.
 */
export const securityCheckApiUrl: string | null =
  (process.env.SECURITY_CHECK_API_URL || "").replace(/\/+$/, "") || null;
