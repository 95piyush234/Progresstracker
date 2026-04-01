# Progress Tracker API

Base URL: `http://localhost:5000/api`

## Auth

### `POST /auth/register`
Request:

```json
{
  "name": "Piyush",
  "email": "piyush@example.com",
  "password": "StrongPass123"
}
```

Response:

```json
{
  "success": true,
  "message": "Verification OTP sent to your email.",
  "data": {
    "email": "piyush@example.com",
    "expiresAt": "2026-03-29T10:10:00.000Z"
  }
}
```

### `POST /auth/verify-email`

```json
{
  "email": "piyush@example.com",
  "otp": "123456"
}
```

Response returns:
- `data.user`
- `data.accessToken`
- `data.session`
- refresh token as an `httpOnly` cookie

### `POST /auth/resend-verification`
### `POST /auth/login`
### `POST /auth/refresh`
### `POST /auth/logout`
### `GET /auth/me`
### `POST /auth/forgot-password`
### `POST /auth/reset-password`

## Goals

### `GET /goals`
Query params:
- `page`
- `limit`
- `search`
- `category`
- `status=active|completed|paused|all`
- `priority=low|medium|high`
- `archived=true|false`
- `sortBy=createdAt|updatedAt|dueDate|targetValue|currentValue|title`
- `sortOrder=asc|desc`

### `POST /goals`

```json
{
  "title": "Read 12 books",
  "description": "A yearly reading target",
  "category": "Reading",
  "unit": "books",
  "targetValue": 12,
  "currentValue": 3,
  "status": "active",
  "priority": "high",
  "color": "#7c3aed",
  "startDate": "2026-01-01T00:00:00.000Z",
  "dueDate": "2026-12-31T00:00:00.000Z",
  "notes": "Track monthly reviews",
  "archived": false
}
```

### `GET /goals/:goalId`
### `PATCH /goals/:goalId`
### `DELETE /goals/:goalId`

## Daily Tasks

### `GET /tasks`
Query params:
- `page`
- `limit`
- `date`
- `status=completed|pending|all`
- `priority`
- `goalId`

### `POST /tasks`

```json
{
  "goal": "65f6f57cbe0af3a2f4a64321",
  "title": "Read 20 pages",
  "description": "Finish evening reading block",
  "date": "2026-03-29T00:00:00.000Z",
  "completed": false,
  "priority": "medium"
}
```

### `PATCH /tasks/:taskId`
### `PATCH /tasks/:taskId/toggle`
### `DELETE /tasks/:taskId`

## Progress Entries

### `GET /progress`
Query params:
- `page`
- `limit`
- `goalId`
- `dateFrom`
- `dateTo`
- `sortBy=entryDate|createdAt|value`
- `sortOrder=asc|desc`

### `POST /progress`

```json
{
  "goal": "65f6f57cbe0af3a2f4a64321",
  "task": "65f6f5e6be0af3a2f4a64329",
  "value": 5,
  "note": "Finished 5 more pages",
  "entryDate": "2026-03-29T00:00:00.000Z",
  "attachment": {
    "url": "/uploads/1711702800-proof.png",
    "filename": "1711702800-proof.png",
    "mimetype": "image/png",
    "size": 84021
  }
}
```

### `PATCH /progress/:entryId`
### `DELETE /progress/:entryId`

## Analytics

### `GET /analytics/overview?days=30`

Response returns:
- `stats`
- `dailySeries`
- `categoryBreakdown`
- `recentEntries`

## Uploads

### `POST /uploads/attachment`
Protected multipart upload:
- field name: `file`
- accepts image files only

## Admin

### `GET /admin/users`
Admin only.

Query params:
- `page`
- `limit`
- `search`
- `role=admin|user`
