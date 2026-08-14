# BangGia Docker Deployment

This deployment runs the public web, admin UI, and API as separate containers.
MongoDB is external and is supplied through `MONGODB_URI`.

## Services

| Service | Container port | Host port | Public route |
|---------|----------------|-----------|--------------|
| `web` | 3000 | 10200 | `/` |
| `admin` | 3000 | 10201 | `/admin` |
| `backend` | 4000 | 10202 | `/api`, `/uploads`, `/health` |

The `uploads` named volume is mounted at `/app/public/uploads` in the backend.
Restore the existing product images into this volume separately from MongoDB.

## Deploy from source

```bash
cp deploy/.env.example deploy/.env
# Edit deploy/.env with the external MongoDB URI and secrets.
docker compose --env-file deploy/.env -f deploy/docker-compose.yml build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
```

The Compose file builds from the repository root. On a server that pulls images
from GHCR instead, use the same file after publishing the three images and set
`IMAGE_TAG` in `deploy/.env`.

Pushing to `main` runs `.github/workflows/docker-publish.yml`, which publishes:

```text
ghcr.io/vothanhlam1793/banggia-backend
ghcr.io/vothanhlam1793/banggia-web
ghcr.io/vothanhlam1793/banggia-admin
```

## Restore MongoDB

Copy the Mongo archive to the MongoDB host and restore it into the configured
database. Do not restore over production without a current backup.

```bash
mongorestore --gzip --archive=banggiasi-v3-YYYYMMDD-HHMMSS.archive.gz \
  --drop --uri="$MONGODB_URI"
```

## Reverse proxy

Point the existing Nginx or Coolify proxy to the host ports above. The admin
route must preserve the `/admin` prefix, and `/uploads` must proxy to backend.
