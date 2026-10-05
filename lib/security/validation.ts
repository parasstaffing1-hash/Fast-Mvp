/**
 * Security and validation utilities for Picked AI Visibility Scanner.
 * Enforces SSRF protection, strict URL parsing, email sanitization, and rate limits.
 */

// Private & reserved IP range prefixes for SSRF protection
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP metadata service
  'metadata.google.internal',
]);

const BLOCKED_IP_PREFIXES = [
  '10.',
  '127.',
  '169.254.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',
  'fc00:',
  'fe80:',
];

export interface ValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates and normalizes target website URL.
 * Protects against SSRF, internal LAN probes, protocol manipulation, and excessive lengths.
 */
export function validateAndNormalizeUrl(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string.' };
  }

  const trimmed = input.trim();
  if (trimmed.length > 512) {
    return { valid: false, error: 'URL length exceeds maximum limit of 512 characters.' };
  }

  // Prepend https if scheme is omitted
  let withProtocol = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    withProtocol = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  // Enforce HTTP / HTTPS only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http and https protocols are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, error: 'Requests to local or internal addresses are prohibited.' };
  }

  // Check blocked IP ranges
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (hostname.startsWith(prefix)) {
      return { valid: false, error: 'Requests to private IP addresses are prohibited.' };
    }
  }

  // Must contain at least one dot in hostname (e.g. example.com, not just "intranet")
  if (!hostname.includes('.')) {
    return { valid: false, error: 'Invalid hostname format.' };
  }

  // Clean and normalize
  parsed.hash = ''; // strip fragments
  return {
    valid: true,
    normalizedUrl: parsed.origin,
  };
}

/**
 * Validates and cleans email address.
 */
export function validateEmail(email: string): { valid: boolean; normalizedEmail?: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required.' };
  }

  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email length exceeds 254 characters.' };
  }

  // Standard RFC 5322 regex approximation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please provide a valid email address.' };
  }

  return { valid: true, normalizedEmail: trimmed };
}

// In-memory token bucket rate limiter for scan creation
const scanAttemptsPerIp = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = scanAttemptsPerIp.get(ip);

  if (!entry || now > entry.resetAt) {
    scanAttemptsPerIp.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}
