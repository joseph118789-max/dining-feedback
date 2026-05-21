import express from 'express';
import { PrismaClient } from '@prisma/client';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Middleware: Verify Supabase JWT token and check admin role
 * Expects: Authorization: Bearer <access_token>
 */
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if user is an admin in our database
    const admin = await prisma.admin.findUnique({
      where: { email: user.email },
    });

    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      role: admin.role,
    };
    req.admin = admin;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * GET /api/admin/reviews
 * Get all feedback entries with pagination and filtering
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - rating: number (filter by rating)
 * - sortBy: 'createdAt' | 'rating' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
router.get('/reviews', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const rating = req.query.rating ? parseInt(req.query.rating, 10) : undefined;
    const sortBy = req.query.sortBy === 'rating' ? 'rating' : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where = rating ? { rating } : {};

    const [feedbacks, total, stats] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.feedback.count({ where }),
      prisma.feedback.groupBy({
        by: ['rating'],
        _count: true,
      }),
    ]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach(({ rating: r, _count }) => {
      ratingDistribution[r] = _count;
    });

    const averageRating = total > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2)
      : 0;

    res.json({
      data: feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        averageRating: parseFloat(averageRating),
        ratingDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reviews/:id
 * Get single feedback by ID
 */
router.get('/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: req.params.id },
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ data: feedback });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/reviews/:id
 * Delete a feedback entry
 */
router.delete('/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: req.params.id },
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await prisma.feedback.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Get overall feedback statistics
 */
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const [total, avgRating, recentCount] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.aggregate({
        _avg: { rating: true },
      }),
      prisma.feedback.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalFeedbacks: total,
      averageRating: avgRating._avg.rating || 0,
      last7Days: recentCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/qr/:feedbackId
 * Generate a QR code (PNG) for a given feedback entry.
 * The QR encodes a deep link to the feedback form pre-filled with that entry's rating.
 *
 * Query params:
 * - size: number (default: 300, range 100-600)
 */
router.get('/qr/:feedbackId', requireAdmin, async (req, res, next) => {
  try {
    const QRCode = await import('qrcode');
    const feedback = await prisma.feedback.findUnique({
      where: { id: req.params.feedbackId },
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const size = Math.min(600, Math.max(100, parseInt(req.query.size, 10) || 300));
    const baseUrl = process.env.FRONTEND_URL || 'https://feedback.seekn.site';
    // Encode rating in URL so staff can show the rating value in the QR landing page
    const deepLink = `${baseUrl}/feedback/${feedback.id}?rating=${feedback.rating}`;

    const pngBuffer = await QRCode.default.toBuffer(deepLink, {
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: '#1e40af',   // blue-800
        light: '#ffffff',
      },
    });

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="feedback-qr-${feedback.id.slice(0, 8)}.png"`);
    res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
