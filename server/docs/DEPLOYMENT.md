# Deployment Guide

## Frontend

### Vercel
1. Import the repo/project
2. Set root directory to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:

```env
VITE_API_URL=https://your-api-domain.com/api
```

### Netlify
1. Set base directory to `client`
2. Build command: `npm run build`
3. Publish directory: `client/dist`
4. Add the same `VITE_API_URL`

## Backend

### Render
1. Create a new Web Service
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add:
   - `MONGODB_URI`
   - `CLIENT_URL`
   - `CLIENT_ORIGINS`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - SMTP credentials

### Railway
1. Create a new service from the repository
2. Set the root to `server`
3. Add environment variables
4. Attach MongoDB Atlas or Railway Mongo

### VPS
1. Install Node.js 20+
2. Clone or upload the project
3. Use `server` as the app directory
4. Run `npm install`
5. Run `npm start`
6. Put Nginx in front of the Node process
7. Use PM2 or systemd for process management

## MongoDB Atlas

1. Create a cluster
2. Create a database user
3. Add your backend IP or allowlist
4. Copy the connection string into `MONGODB_URI`

## Production notes

- Use strong JWT secrets
- Use `sameSite=none` cookies with HTTPS in production
- Configure SMTP for real email delivery
- Use a CDN or object storage if you outgrow local uploads
