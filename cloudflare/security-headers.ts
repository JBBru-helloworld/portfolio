/**
 * Security headers (Phase 7a), on every response the Worker answers (pages, the videos, the counter). Static
 * files that Cloudflare serves without the Worker get the same headers from public/_headers; `pnpm check:content`
 * fails if the two differ.
 *
 * The CSP allows only this origin, plus the youtube-nocookie.com player that a project page's video facade
 * loads on click (and www.google.com, where YouTube sends some visitors, such as those on shared or VPN
 * addresses, to a CAPTCHA before the video; without it they would see a blocked frame). Scripts need 'unsafe-inline': Next.js writes each page's data as inline scripts (per-request
 * nonces would make every page dynamic). Styles need it for inline style attributes. data: images are the
 * small inline SVGs and the image placeholders.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com https://www.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "X-Frame-Options": "DENY",
};
