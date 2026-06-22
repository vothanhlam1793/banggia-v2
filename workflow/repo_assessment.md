# Repo Assessment

## Overall Status
- ready-for-work
- Minor gaps: no root README, no docker-compose, GraphQL layer deprecated but not deleted

## Structure Summary
```
banggia/
├── plan.html              # Original implementation plan (Vietnamese, 392 lines)
├── backend/               # Express REST API + Apollo GraphQL (Node.js 22 ESM)
│   ├── src/index.js       # Entry point
│   ├── src/models/        # Product, PriceLog, User (Mongoose)
│   ├── src/routes/        # products, prices, auth, sync, tags, groups, agent
│   ├── src/graphql/       # Deprecated Apollo layer
│   ├── src/services/      # kiotviet.js (KiotViet POS API client)
│   ├── src/middleware/     # JWT auth guards
│   └── src/lib/           # Response helpers
├── admin/                 # Admin dashboard (Next.js 16, React 19, Tailwind 4, TS)
│   └── app/               # pages: /, /login, /products, /products/[code], /tags, /groups
├── web/                   # Public price list (Next.js 16, React 19, Tailwind 4, TS)
│   └── app/               # pages: /, /info
├── dify/                  # Dify AI agent tool definitions (JSON configs, not deployed)
└── docs/
    ├── ARCHITECTURE.md    # Comprehensive architecture doc (248 lines)
    ├── DLVIP.csv          # Selling prices (33 products, pending import)
    └── BANG-GIA-KHUYENMAI.csv  # Promotional prices (51 products, pending mapping)
```

## Existing Docs
- **docs/ARCHITECTURE.md** — Complete: overall architecture, Nginx proxy, REST API endpoints, data models, current stats, environment config, pending tasks
- **plan.html** — Original Vietnamese implementation plan with 7-phase roadmap
- **No root README.md** — admin/ and web/ have default Next.js boilerplate READMEs only
- **No AGENTS.md or CLAUDE.md** at root level

## Entry Points
| Service | Port | Dev | Prod | Build |
|---------|------|-----|------|-------|
| Backend | 10202 | `npm run dev` | `npm start` | N/A |
| Admin | 10201 | `npm run dev` | `npm start` | `npm run build` |
| Web | 10200 | `npm run dev` | `npm start` | `npm run build` |

## Build / Run / Test
- `npm run dev` — start dev server (available in all 3 packages)
- `npm run build` — production build (admin, web)
- `npm start` — start production server (all 3)
- No test framework or test commands found
- No lint command found in any package.json

## Key Modules
- `backend/src/routes/products.js` — Core product API (count, stale detection, CRUD)
- `backend/src/routes/prices.js` — Price update endpoint (L0-L4)
- `backend/src/services/kiotviet.js` — KiotViet POS sync client
- `backend/src/models/Product.js` — Central data model
- `admin/app/page.tsx` — Admin dashboard (stale price table)
- `admin/app/products/[code]/page.tsx` — Product detail + price editor
- `web/app/page.tsx` — Public price list page

## Risks
- Admin auth middleware `requireAdmin` exists but is never enforced in route handlers
- GraphQL/Apollo layer is deprecated but still loaded (adds startup time and surface area)
- No automated tests — all verification is manual/local
- No Dockerfiles or docker-compose (planned but not implemented)
- Git repo not initialized in this working directory

## Missing Context
- No root README.md with project overview, setup instructions, or quickstart
- No AGENTS.md for future OpenCode sessions
- No test suite or CI/CD configuration
- No lint/format configuration at root level

## Recommendation
Repo is well-documented at the architecture level. Proceed directly with user's intended task. If the task is undefined, ask for Goal/Context/Verify to create an execution brief. Consider adding a root README.md as a fast follow-up for future delegation.
