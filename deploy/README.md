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

## Choose a deployment mode

Use **one** of the two modes below. Do not start both modes on the same host,
because they use the same ports.

## All services on one host

Run these commands from the repository root:

```bash
cp deploy/.env.example deploy/.env
# Edit deploy/.env with the external MongoDB URI and secrets.
docker compose --env-file deploy/.env -f deploy/docker-compose.yml build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
```

This mode builds from source. To use the published GHCR images instead, log in
to GHCR, run `pull`, then start with `--no-build`:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml pull
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --no-build
```

Pushing to `main` runs `.github/workflows/docker-publish.yml`, which publishes:

```text
ghcr.io/vothanhlam1793/banggia-backend
ghcr.io/vothanhlam1793/banggia-web
ghcr.io/vothanhlam1793/banggia-admin
```

## Deploy as three separate projects

Use one Compose file per server/project. Run these commands from the repository
root:

```bash
cp deploy/.env.backend.example deploy/.env.backend
cp deploy/.env.web.example deploy/.env.web
cp deploy/.env.admin.example deploy/.env.admin

# Edit each env file before starting its service.
docker compose --env-file deploy/.env.backend -f deploy/docker-compose.backend.yml pull
docker compose --env-file deploy/.env.backend -f deploy/docker-compose.backend.yml up -d

docker compose --env-file deploy/.env.web -f deploy/docker-compose.web.yml pull
docker compose --env-file deploy/.env.web -f deploy/docker-compose.web.yml up -d

docker compose --env-file deploy/.env.admin -f deploy/docker-compose.admin.yml pull
docker compose --env-file deploy/.env.admin -f deploy/docker-compose.admin.yml up -d
```

The matching example files are:

```bash
deploy/.env.backend.example  # backend + external MongoDB
deploy/.env.web.example      # public web
deploy/.env.admin.example    # admin UI
```

Keep the three resulting `.env.*` files private on their respective servers.

The backend project needs `MONGODB_URI`. The web and admin projects need
`BACKEND_INTERNAL_URL`, for example `http://10.0.0.20:10202` when the backend
server is reachable over a private network. If they are on separate public
domains, use the backend HTTPS URL and restrict it with authentication or a
firewall where possible.

The backend, web, and admin containers must be able to reach the addresses in
their respective env files. A Compose network name such as `backend:4000` only
works when all services use the same Compose project; use a real private DNS/IP
for the three-project setup.

Example per-project variables:

```env
# backend server
MONGODB_URI=mongodb://user:password@mongo.internal:27017/banggiasi-v3?authSource=admin
JWT_SECRET=long-random-secret
DEFAULT_ADMIN_PASSWORD=long-random-password

# web/admin server
BACKEND_INTERNAL_URL=http://backend.internal:10202
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

Recommended routes:

```text
/             -> web:10200
/admin        -> admin:10201
/api          -> backend:10202
/uploads      -> backend:10202
/health       -> backend:10202
```
