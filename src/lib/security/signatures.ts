// Pattern signatures for safe payload detection. These are intentionally
// conservative — they flag clearly suspicious shapes rather than every
// instance of an SQL keyword in user content.

// SQL injection signatures
export const SQLI_PATTERNS: RegExp[] = [
  /(\b(union|select)\b.*\bfrom\b)/i,
  /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/i,
  /;\s*(drop|truncate|delete|update|insert)\s+/i,
  /\bxp_cmdshell\b/i,
  /'\s*or\s*'1'\s*=\s*'1/i,
  /--\s*$/m,
  /\/\*.*\*\//,
  /\bpg_sleep\s*\(/i,
  /\bsleep\s*\(\s*\d+\s*\)/i,
  /\bload_file\s*\(/i,
  /\binformation_schema\b/i,
];

// XSS signatures
export const XSS_PATTERNS: RegExp[] = [
  /<\s*script\b/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover|focus)\s*=/i,
  /<\s*iframe\b/i,
  /<\s*svg[^>]*on\w+/i,
  /\bdata\s*:\s*text\/html/i,
  /document\.cookie/i,
  /<\s*img[^>]+src\s*=\s*["']?\s*x\s*["']?[^>]*onerror/i,
];

// Path-traversal / RCE shapes
export const TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.[\\/]\.\.[\\/]/,
  /\/etc\/passwd/i,
  /\\windows\\system32/i,
  /\$\{.*\}/, // template injection
  /\b(curl|wget)\s+http/i,
];

export type SignatureHit = {
  category: "sqli" | "xss" | "traversal";
  pattern: string;
  sample: string;
};

export function scanPayload(input: string): SignatureHit | null {
  if (!input) return null;
  const value = input.slice(0, 4000); // cap
  for (const re of SQLI_PATTERNS) {
    const m = value.match(re);
    if (m) return { category: "sqli", pattern: re.source, sample: m[0].slice(0, 120) };
  }
  for (const re of XSS_PATTERNS) {
    const m = value.match(re);
    if (m) return { category: "xss", pattern: re.source, sample: m[0].slice(0, 120) };
  }
  for (const re of TRAVERSAL_PATTERNS) {
    const m = value.match(re);
    if (m) return { category: "traversal", pattern: re.source, sample: m[0].slice(0, 120) };
  }
  return null;
}

// Security headers (single source of truth — middleware writes these;
// scanner verifies them).
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site",
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};
