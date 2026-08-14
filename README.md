# BangGia v3

CRETA product price catalog with a public web app, admin UI, and Express API.

## Deployment

Docker deployment files and operator instructions are in [`deploy/README.md`](deploy/README.md).

There are two supported layouts:

- One host: `deploy/docker-compose.yml`
- Three separate projects: `deploy/docker-compose.backend.yml`, `deploy/docker-compose.web.yml`, and `deploy/docker-compose.admin.yml`

MongoDB is external and configured with `MONGODB_URI`. The three-project setup
uses separate env examples:

```text
deploy/.env.backend.example
deploy/.env.web.example
deploy/.env.admin.example
```

Do not commit real `.env` files, MongoDB credentials, JWT secrets, or uploaded
product images.

## Source layout

```text
backend/   Express API and MongoDB models
web/       Public Next.js application
admin/     Admin Next.js application
deploy/    Docker Compose and deployment documentation
```
