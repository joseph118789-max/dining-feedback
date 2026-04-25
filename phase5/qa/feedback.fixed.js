import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { sanitizeBody } from '../middleware/sanitize.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/feedback
 * Submit dining feedback (requires SSO authentication)
 * 
 * Request body:
 * - phoneNumber (optional): string
 * - rating: number (1-5)
 * - comments (optional): string
 * 
 * Email is captured from SSO session automatically.
 * All string fields are sanitized to prevent XSS before storage.
 */
router.post('/',
  // Require authentication
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required. Please login with Google.' });
    }
    next();
  },
  // Sanitize body before validation
  sanitizeBody,
  // Validation
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
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phoneNumber, rating, comments } = req.body;
      const customerEmail = req.user.email;

      // Create feedback entry — comments are already sanitized by sanitizeBody middleware
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

export default router;