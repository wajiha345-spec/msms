import rateLimit from 'express-rate-limit';

// Shared limiter configs for the routes most exposed to brute-force/spam
// abuse — none of this existed before (express-rate-limit was not installed
// anywhere in the app). Requires app.set('trust proxy', 1) in app.ts to key
// by the real client IP on Railway rather than its front-end proxy.
const message = { success: false, error: 'Too many requests. Please try again later.' };

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

export const publicSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
