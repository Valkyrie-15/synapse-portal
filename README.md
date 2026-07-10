# Synapse Cashless Portal Aggregator

A production-quality enterprise healthcare dashboard for managing cashless insurance portals, documents, contacts, and commercials for 11 TPAs and insurers.

## Features

- **Multi-insurer dashboard** — Vitraya, Star Health, ICICI Lombard, HDFC Ergo, Niva Bupa, Medi Assist, Vidal Health, FHPL, MD India, Paramount, Raksha TPA
- **Vitraya working integration** — opens the official provider portal in a new tab
- **Resource cards** — Portal Link, Hospital Contract, Surgical Packages, SOP, Circulars, Cashless Manual, Escalation Matrix, Contact Details, FAQs
- **Analytics sidebar** — Recharts pie chart + bar chart with real claims stats per insurer
- **Role-based auth** — JWT-based, admin vs. regular user
- **Full admin CRUD** — insurers, documents, contacts, commercials
- **Docker support** — single `docker compose up` to run everything

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker and Docker Compose (for PostgreSQL)

### 1. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Install and setup

```bash
cd synapse-portal
npm install
npm run setup
npm run dev
```

Open http://localhost:3000

### Demo Credentials

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | admin    | admin123   |
| User  | user     | user123    |

---

## Full Docker Start

```bash
docker compose up --build
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```
DATABASE_URL=postgresql://synapse:synapse_secret@localhost:5432/synapse_portal
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
```

---

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS v4
- Radix UI (shadcn-style components)
- Recharts for analytics
- PostgreSQL + Prisma v5
- JWT authentication (jose library)
- Docker + Docker Compose

---

## Scripts

| Script            | Description                      |
|-------------------|----------------------------------|
| npm run dev       | Start development server         |
| npm run build     | Production build                 |
| npm run setup     | Push schema + seed database      |
| npm run db:push   | Push Prisma schema to database   |
| npm run db:seed   | Run seed script                  |
| npm run db:studio | Open Prisma Studio               |

---

## Project Structure

```
src/
  app/
    login/          Login page
    dashboard/      Main dashboard with insurer selector
    admin/          Admin panel (CRUD for all entities)
    api/            REST API routes
  components/
    ui/             Reusable UI primitives (Button, Card, Select, Dialog, Table...)
    Navbar.tsx      Top navigation bar
    ResourceCards.tsx  Document and contact resource cards
    AnalyticsSidebar.tsx  Claims stats + Recharts visualizations
  lib/
    auth.ts         JWT sign/verify helpers
    db.ts           Prisma client singleton
    utils.ts        cn() utility
  middleware.ts     Route protection (auth + admin guard)
prisma/
  schema.prisma     Database schema
  seed.ts           Demo data for all 11 insurers
```
