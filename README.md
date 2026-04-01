# Progress Tracker Full-Stack Workspace

This workspace now contains a new full-stack implementation in:

- [C:\Users\pc\Documents\tracker\client](C:\Users\pc\Documents\tracker\client) — React + Tailwind frontend
- [C:\Users\pc\Documents\tracker\server](C:\Users\pc\Documents\tracker\server) — Express + MongoDB backend

Older root-level files are left untouched so the new build stays isolated and safe.

## Run order

1. Copy:
   - [C:\Users\pc\Documents\tracker\server\.env.example](C:\Users\pc\Documents\tracker\server\.env.example) -> `server/.env`
   - [C:\Users\pc\Documents\tracker\client\.env.example](C:\Users\pc\Documents\tracker\client\.env.example) -> `client/.env`
2. Start the backend in [C:\Users\pc\Documents\tracker\server](C:\Users\pc\Documents\tracker\server)
3. Start the frontend in [C:\Users\pc\Documents\tracker\client](C:\Users\pc\Documents\tracker\client)

## Local commands

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

## App capabilities

- Signup + login
- Email verification with OTP
- Forgot/reset password
- Goals CRUD
- Daily tasks CRUD
- Progress logging with file upload
- Analytics overview with streaks and completion rate
- Protected routes on frontend + backend
"# Progresstracker" 
"# Progresstracker" 
"# Progresstracker" 
