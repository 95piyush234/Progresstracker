# Frontend Integration Guide

The React client in [C:\Users\pc\Documents\tracker\client](C:\Users\pc\Documents\tracker\client) is already wired to this backend.

## API base URL

Set [C:\Users\pc\Documents\tracker\client\.env.example](C:\Users\pc\Documents\tracker\client\.env.example):

```env
VITE_API_URL=http://localhost:5000/api
```

## Axios setup

The main Axios client is in [C:\Users\pc\Documents\tracker\client\src\api\axios.js](C:\Users\pc\Documents\tracker\client\src\api\axios.js).

Key behavior:
- sends `Authorization: Bearer <accessToken>`
- includes cookies with `withCredentials: true`
- auto-refreshes an expired access token through `/auth/refresh`

## Auth flow

1. `POST /auth/register`
2. `POST /auth/verify-email`
3. Save `accessToken` in local storage
4. Refresh token remains in an `httpOnly` cookie
5. Axios uses `/auth/refresh` when needed

## Example React usage

```js
import { goalsApi } from "./api/services";

const response = await goalsApi.list({ page: 1, limit: 6, status: "active" });
setGoals(response.data.goals);
```

## Upload flow

1. Upload image to `/uploads/attachment`
2. Receive file metadata
3. Send that metadata as `attachment` inside `POST /progress`

This flow is already implemented in [C:\Users\pc\Documents\tracker\client\src\pages\DailyTrackerPage.jsx](C:\Users\pc\Documents\tracker\client\src\pages\DailyTrackerPage.jsx).
