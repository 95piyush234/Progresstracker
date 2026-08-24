import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config, isGoogleOAuthConfigured } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { issueAuthTokens, setRefreshCookie } from "../services/auth.service.js";

export const googleRouter = Router();

// ─── Strategy setup ──────────────────────────────────────────────────────────
// Only register the strategy when credentials are present so the server boots
// cleanly even without Google OAuth configured.
if (isGoogleOAuthConfigured()) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ["profile", "email"]
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          const name =
            profile.displayName ||
            [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ") ||
            "Google User";

          if (!email) {
            return done(new ApiError(400, "Google did not return an email address."));
          }

          // 1. Try to find by googleId (returning Google users)
          let user = await User.findOne({ googleId: profile.id });

          // 2. Try to find by email (account already exists via email/password)
          if (!user) {
            user = await User.findOne({ email });
          }

          if (user) {
            // Link the Google account if not already linked
            if (!user.googleId) {
              user.googleId = profile.id;
              user.authProvider = "google";
            }
            if (!user.isVerified) {
              user.isVerified = true;
            }
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          // 3. Create a new Google-only account
          const newUser = new User({
            name,
            email,
            password: null,
            googleId: profile.id,
            authProvider: "google",
            isVerified: true,
            lastLoginAt: new Date()
          });
          await newUser.save();
          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Passport session stubs — we use stateless JWTs, so these are no-ops.
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Redirects the browser to Google's consent screen.
 */
googleRouter.get(
  "/",
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.redirect(
        `${config.clientUrl}?google_error=${encodeURIComponent(
          "Google Sign-In is not configured on this server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env."
        )}`
      );
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user consents. We exchange the code for
 * tokens, set the refresh cookie, and redirect back to the frontend with the
 * access token embedded in the URL fragment so script.js can pick it up.
 */
googleRouter.get(
  "/callback",
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.redirect(
        `${config.clientUrl}?google_error=${encodeURIComponent("Google OAuth is not configured.")}`
      );
    }

    passport.authenticate("google", { session: false }, async (err, user) => {
      if (err || !user) {
        const message =
          err?.message || "Google authentication failed. Please try again.";
        return res.redirect(
          `${config.clientUrl}?google_error=${encodeURIComponent(message)}`
        );
      }

      try {
        const auth = await issueAuthTokens(user, {
          userAgent: req.headers["user-agent"] || "",
          ipAddress: req.ip || ""
        });

        setRefreshCookie(res, auth.refreshToken);

        // Pass the access token and a minimal user snapshot to the frontend
        // via the URL fragment (never lands in server logs or referrer headers).
        const params = new URLSearchParams({
          google_token: auth.accessToken,
          google_user: JSON.stringify({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            authProvider: user.authProvider || "google"
          }),
          session_id: auth.session.id
        });

        return res.redirect(`${config.clientUrl}#${params.toString()}`);
      } catch (issueError) {
        return res.redirect(
          `${config.clientUrl}?google_error=${encodeURIComponent(
            issueError.message || "Could not create a session after Google login."
          )}`
        );
      }
    })(req, res, next);
  }
);
