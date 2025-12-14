# Mosip — Inji Verify

A small identity verification/demo application with a Next.js frontend and a Python backend. The project demonstrates a verification flow, dashboard screens, audit logs, batch submissions, and passport handling.

**Tech stack:** Next.js (App Router, TypeScript), React, Node, Python backend, Prisma, Supabase (or other DB), Docker Compose for local containers.

**Quick links:** app/, backend/, components/, prisma/, utils/.

## Features

- Identity verification UI and flows (see `components/` and `app/`)
- Audit logs, batch submission, inspection requests and passport flows
- Reusable UI primitives in `components/ui`
- Docker + docker-compose for containerized local development

## Repo layout

- `app/` — Next.js app (routes, pages, API actions)
- `components/` — React components and UI primitives
- `backend/` — Python backend service and API (`main.py`)
- `prisma/` — Prisma schema and DB migrations
- `utils/` — helper scripts (seed data, etc.)
- `docker-compose.yml`, `Dockerfile.*` — containerized setup

## Prerequisites

- Node.js (18+) and npm (or pnpm/yarn)
- Python 3.10+ and `pip` for the backend
- Docker & Docker Compose (optional, recommended for production-like local run)

## Local development

1. Clone the repo and change into the project folder:

```bash
git clone <repo-url>
cd Mosip
```

2. Copy or create your environment file:

```bash
cp .env .env.local
# Edit .env.local and provide keys (Supabase / DATABASE_URL / API keys)
```

3. Install frontend dependencies and run Next.js dev server:

```bash
npm install
npm run dev
# Open http://localhost:3000
```

4. Start the Python backend (in a separate terminal):

```bash
cd backend
python -m venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
# or, if the backend is ASGI (FastAPI):
# uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

5. Prisma / database (if used):

```bash
# From project root (if using Prisma)
npx prisma generate
npx prisma migrate dev --name init
```

6. Seed sample data (optional):

```bash
# If `utils/seedData.ts` exists and you have ts-node:
npx ts-node utils/seedData.ts
```

## Environment variables

The project uses a `.env` file for secrets and configuration. Typical variables you will need to provide include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (used by Prisma/backend)
- Any other keys referenced in `.env` or `app/actions` and `backend` code

Keep sensitive keys out of version control.

## Development notes

- Frontend uses the Next.js App Router (see `app/` directory).
- UI primitives and design system live in `components/ui` for easy reuse.
- The backend is intentionally lightweight; extend routes in `backend/main.py`.
- Use `components/InjiVerify.tsx` and `app/verify` to inspect verification flows.

## Contributing

- Open an issue for bugs or feature requests.
- Create clear, focused PRs against `main` or an agreed feature branch.
- Keep changes small and add tests where appropriate.

## License & Contact

This repository does not include a license file by default — add a `LICENSE` if you plan to publish. For questions, contact the maintainer listed in the repo or open an issue.

---

If you'd like, I can also:

- add a minimal `.env.example` with common keys
- add `npm` scripts for starting frontend + backend together
- run `docker-compose up` and verify services start locally

README saved as `Mosip/README_NEW.md`.