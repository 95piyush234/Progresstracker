# Progress Tracker Server

Production-ready `Node.js + Express + MongoDB` backend for the Progress Tracker SaaS application.

## Included features

- JWT auth with access token + refresh cookie
- Email OTP verification for signup
- Forgot/reset password with email link
- Goals CRUD
- Daily tasks CRUD + toggle
- Progress logging with optional image upload
- Analytics overview with streaks and completion rate
- Admin-only user listing
- Joi validation, centralized error handling, Helmet, CORS, rate limiting

## Run locally

1. Install `Node.js 20+`
2. Install `MongoDB` locally or create a MongoDB Atlas cluster
3. Copy `.env.example` to `.env`
4. From [C:\Users\pc\Documents\tracker\server](C:\Users\pc\Documents\tracker\server):

```bash
npm install
npm run dev
```

The API runs on `http://localhost:5000`.

## Seed demo data

After `.env` is ready and MongoDB is connected:

```bash
npm run seed
```

This creates:
- a verified demo user
- 3 sample goals
- sample daily tasks
- sample progress entries

## Docs

- API reference: [C:\Users\pc\Documents\tracker\server\docs\API.md](C:\Users\pc\Documents\tracker\server\docs\API.md)
- Frontend integration: [C:\Users\pc\Documents\tracker\server\docs\FRONTEND_INTEGRATION.md](C:\Users\pc\Documents\tracker\server\docs\FRONTEND_INTEGRATION.md)
- Deployment guide: [C:\Users\pc\Documents\tracker\server\docs\DEPLOYMENT.md](C:\Users\pc\Documents\tracker\server\docs\DEPLOYMENT.md)
