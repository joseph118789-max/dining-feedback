import express from 'express';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Google OAuth2 Initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
}));

// Google OAuth2 Callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failed' }),
  async (req, res) => {
    try {
      // Store or update OAuth session in DB
      await prisma.oAuthSession.upsert({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId: req.user.providerId,
          },
        },
        update: {
          email: req.user.email,
          accessToken: req.user.accessToken,
          refreshToken: req.user.refreshToken,
          expiresAt: req.user.expiresAt,
        },
        create: {
          provider: 'google',
          providerId: req.user.providerId,
          email: req.user.email,
          accessToken: req.user.accessToken,
          refreshToken: req.user.refreshToken,
          expiresAt: req.user.expiresAt,
        },
      });

      // Redirect to frontend with session info
      res.redirect(`${process.env.FRONTEND_URL}/?auth=success&email=${encodeURIComponent(req.user.email)}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/?auth=error`);
    }
  }
);

// Auth failed
router.get('/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

// Auth success
router.get('/success', (req, res) => {
  res.json({ message: 'Authenticated successfully', user: req.user });
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;