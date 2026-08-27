# world-Of-War-mounts

Monorepo extracted from `World-Of-War-mounts.zip` and wired for Grudge Studio deployment flow.

## Apps

- Frontend game: `artifacts/toon-rts`
- Backend API: `artifacts/api-server`

## Local Dev

```bash
# install
COREPACK_ENABLE_STRICT=0 pnpm install

# run frontend (defaults to PORT=3000, BASE_PATH=/)
COREPACK_ENABLE_STRICT=0 pnpm --filter @workspace/toon-rts dev

# run backend API
PORT=8080 COREPACK_ENABLE_STRICT=0 pnpm --filter @workspace/api-server start
```

## Vercel Deployment (Frontend)

Project root uses `vercel.json`:

- build command installs deps and builds `@workspace/toon-rts`
- output directory is `artifacts/toon-rts/dist/public`

```bash
vercel deploy --prod --yes --name world-of-war
```

## Railway Deployment (API)

Project root uses `railway.json`:

- build command installs deps and builds `@workspace/api-server`
- start command runs API server package
- health check path: `/health`

```bash
railway up --service world-of-war-api --detach
```

## Notes

- `COREPACK_ENABLE_STRICT=0` is required in this environment because a parent workspace pins a different package manager.
- Frontend build now defaults to `PORT=3000` and `BASE_PATH=/` when env vars are not set.
