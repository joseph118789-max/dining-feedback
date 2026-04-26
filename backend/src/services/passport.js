import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    
    if (!email) {
      return done(new Error('No email found in Google profile'));
    }

    const user = {
      provider: 'google',
      providerId: profile.id,
      email,
      name: profile.displayName,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + accessToken.expires_in * 1000),
    };

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialize/deserialize for session
passport.serializeUser((user, done) => {
  done(null, {
    email: user.email,
    name: user.name,
    provider: user.provider,
  });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    const user = await prisma.oAuthSession.findFirst({
      where: { email: sessionUser.email },
    });
    done(null, user || sessionUser);
  } catch (error) {
    done(error);
  }
});

export default passport;