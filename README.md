# MooveSaathi Frontend

React + TypeScript frontend for the MooveSaathi ride-sharing platform.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

## Build

```powershell
npm run build
```

## Environment

- `VITE_API_URL` points to the backend API base, for example `http://localhost:8000/api/v1`
- `VITE_WS_URL` points to the backend chat websocket base, for example `ws://localhost:8000/api/v1/chat/ws`

## Production readiness

This frontend now includes:

- refresh-token based session recovery aligned with the backend
- logout, forgot-password, reset-password, verify-email, and resend-verification flows
- route protection with session bootstrap instead of assuming token permanence
- stronger API client behavior for 401 refresh and session teardown
- deployment-oriented Nginx headers and static asset caching

## Notes

- In non-production backend environments, verification and reset tokens may be surfaced by the API for local testing.
- If the backend enables `REQUIRE_EMAIL_VERIFICATION=true`, the frontend login flow will respect that and guide users through verification instead of silently failing.
