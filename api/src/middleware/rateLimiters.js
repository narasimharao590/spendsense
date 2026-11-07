import rateLimit from 'express-rate-limit';

function respond(message) {
  return (_req, res) => {
    res.status(429).json({ message });
  };
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: respond('Too many authentication attempts, please try again in a few minutes'),
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respond('Too many requests, please slow down'),
});
