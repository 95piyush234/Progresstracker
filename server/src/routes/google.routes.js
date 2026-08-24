import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config, isGoogleOAuthConfigured } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { issueAuthTokens, setRefreshCookie } from "../services/auth.service.js";

export const googleRouter = Router();

// ─── Register Google strategy ─────────────────────────────────────────────────
if (isGoogleOAuthConfigured()) {
  passport.use(
    "google",
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
            [profile.name?.givenName, profile.name?.familyName]
              .filter(Boolean)
              .join(" ") ||
            "Google User";

          if (!email) {
            return done(new ApiError(400, "Google did not return an email address."));
          }

          // 1. Returning Google user
          let user = await User.findOne({ googleId: profile.id });

          // 2. Existing email/password account — link it
          if (!user) {
            user = await User.findOne({ email });
          }

          if (user) {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.authProvider = "google";
            }
            if (!user.isVerified) user.isVerified = true;
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          // 3. Brand new user via Google
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
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await User.findById(id));
    } catch (err) {
      done(err);
    }
  });
}

// ─── GET /api/auth/google ─────────────────────────────────────────────────────
googleRouter.get("/", (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(
      `${config.clientUrl}?google_error=${encodeURIComponent(
        "Google Sign-In is not configured on this server."
      )}`
    );
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })(req, res, next);
});

// ─── GET /api/auth/google/callback ───────────────────────────────────────────
googleRouter.get("/callback", (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(
      `${config.clientUrl}?google_error=${encodeURIComponent(
        "Google OAuth is not configured."
      )}`
    );
  }

  passport.authenticate(
    "google",
    { session: false },
    async (err, user) => {
      if (err || !user) {
        const message = err?.message || "Google authentication failed.";
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
            issueError.message || "Could not create session after Google login."
          )}`
        );
      }
    }
  )(req, res, next);
});
