import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Middleware: Verify Supabase JWT token OR allow X-Test-Email bypass for dev
 */
const verifyAuth = async (req, res, next) => {
  // Dev/test bypass: allow with X-Test-Email header
  if (req.headers['x-test-email']) {
    req.user = { email: req.headers['x-test-email'] };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { email: user.email };
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * POST /api/feedback
 * Submit dining feedback (requires Supabase SSO authentication)
 *
 * Request body:
 * - phoneNumber (optional): string
 * - rating: number (1-5)
 * - comments (optional): string
 *
 * Email is captured from SSO session automatically.
 *
 * NOTE: For testing without OAuth, include header:
 *   X-Test-Email: test@example.com
 */
router.post('/',
  verifyAuth,
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('phoneNumber')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body('comments')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Comments must be under 2000 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, rating, comments } = req.body;
      const customerEmail = req.user.email;

      const feedback = await prisma.feedback.create({
        data: {
          customerEmail,
          phoneNumber: phoneNumber || null,
          rating: parseInt(rating, 10),
          comments: comments || null,
        },
      });

      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/feedback/guest
 * Submit dining feedback as a guest (no authentication required)
 * Phone number is mandatory for guest submissions.
 *
 * Request body:
 * - phoneNumber: string (required)
 * - rating: number (1-5) (required)
 * - comments (optional): string
 */
router.post('/guest',
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required for guest feedback'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comments')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Comments must be under 2000 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, rating, comments } = req.body;

      const feedback = await prisma.feedback.create({
        data: {
          customerEmail: `guest:${phoneNumber}`, // prefix to identify guest entries
          phoneNumber,
          rating: parseInt(rating, 10),
          comments: comments || null,
        },
      });

      res.status(201).json({
        message: 'Feedback submitted successfully',
        feedback,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
