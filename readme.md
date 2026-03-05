# AI Commerce War OS

> Cross-border E-commerce AI Operation System / 跨境电商 AI 作战操作系统

A full-stack intelligent decision platform that transforms cross-border e-commerce operations from manual, reactive workflows into data-driven, hour-level decision cycles. The system covers the entire loop: **Signal -> Recommendation -> Action -> Verification -> Learning**.

---

## Screenshots

| War Room | Battle Card |
|----------|-------------|
| KPI cards, sales trend, ad performance, risk heatmap | Per-SKU metrics, competitor comparison, alerts, recommendations |

| Alerts | Action Center |
|--------|---------------|
| Multi-filter alert list with evidence chain | State-machine driven action workflow with approval |

---

## Features

### V1 (Current - Minimum Viable Loop)
- **War Room** — Real-time overview: sales, ad spend, TACOS, stockout count, trends, risk heatmap
- **Alert Engine** — 9 rules across 4 categories (stockout, ads waste, competitor moves, pricing)
- **Battle Card** — Per-SKU command center: KPIs, charts, alerts, recommendations, action history
- **Action Center** — Full state machine: Draft -> Submit -> Approve -> Execute -> Verify -> Close
- **Guardrails** — Max delta %, margin floor, cooldown, daily limits, batch impact cap
- **Approval Flow** — Risk-score based auto-routing, role-based approval chains
- **Audit** — Append-only audit log with trigger-enforced immutability
- **RBAC** — Company-isolated multi-tenant with 5 role levels
- **Settings** — Configurable thresholds, metric definitions with versioning, permission management

### V2 (Planned)
- New product testing engine (Gate system)
- Semi-automated ad budget migration
- Demand forecasting models
- Supply chain & procurement collaboration

### V3 (Planned)
- Autonomous pricing / bidding / replenishment with strong guardrails
- Playbook library with online A/B testing
- Full auto-pilot mode with grayscale rollout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | TypeScript, NestJS, TypeORM |
| **Frontend** | TypeScript, React 18, Next.js 14 (App Router), Ant Design 5 |
| **Charts** | ECharts (via echarts-for-react) |
| **State** | Zustand |
| **Database** | PostgreSQL 15 (27 tables) |
| **Cache** | Redis 7 |
| **Infra** | Docker, Docker Compose |
| **Testing** | Jest, @nestjs/testing, React Testing Library |

---

## Project Structure

```
.
├── backend/                    NestJS API server
│   └── src/
│       ├── auth/               JWT authentication, RBAC, user/company management
│       ├── data/               Store, site, SKU, competitor, metric definitions, thresholds
│       ├── metrics/            War Room aggregation, SKU metrics, snapshots, fact tables
│       ├── alert/              Idempotent alert creation, filtering, acknowledge/close
│       ├── recommendation/     Evidence-based suggestions, accept/reject workflow
│       ├── action/             State machine, approval, execution, rollback, audit log
│       └── common/
│           ├── engines/        Rule engine, stockout/ads/competitor/pricing rules,
│           │                   guardrails, approval strategy, verification engine
│           ├── jobs/           Hourly alert scan, daily summary, verification cron
│           └── utils/          Dedupe (SHA-256), metrics calculator
├── frontend/                   Next.js web console
│   └── src/
│       ├── app/                10 page routes (war-room, alerts, skus, actions, settings, login)
│       ├── components/         12 reusable components (KPI cards, charts, tables, panels)
│       ├── store/              5 Zustand stores
│       ├── lib/                API client, auth utilities, mock data
│       └── types/              Shared TypeScript type definitions
├── docker/                     Docker Compose (postgres + redis + backend + frontend)
├── scripts/
│   ├── init-db.sql             Full DDL: 27 tables, indexes, audit trigger
│   └── seed-data.sql           Demo data: company, users, stores, SKUs, alerts, thresholds
└── package.json                Monorepo scripts
```

---

## Quick Start

### Prerequisites
- Node.js >= 20
- Docker & Docker Compose (for database)

### 1. Clone

```bash
git clone https://github.com/elicat001/kuajingdianshangwar.git
cd kuajingdianshangwar
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL + Redis
cd docker && docker-compose up -d postgres redis

# Initialize database
docker-compose exec -T postgres psql -U postgres -d ai_commerce_war -f /scripts/init-db.sql
docker-compose exec -T postgres psql -U postgres -d ai_commerce_war -f /scripts/seed-data.sql
```

### 3. Start Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
# API running at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Web UI at http://localhost:3001
```

### Or use Docker Compose for everything

```bash
cd docker && docker-compose up -d --build
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123 |
| Manager | manager@demo.com | admin123 |
| Operator | operator@demo.com | admin123 |

---

## API Overview

| Group | Endpoints |
|-------|----------|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/me` |
| **Stores & Sites** | `GET/POST /api/stores`, `GET/POST /api/sites` |
| **SKUs** | `GET /api/skus`, `GET /api/skus/:id` (paginated, filterable) |
| **Metrics** | `GET /api/metrics/war-room`, `GET /api/metrics/sku/:id` |
| **Alerts** | `GET /api/alerts`, `POST /api/alerts/:id/ack`, `POST /api/alerts/:id/close` |
| **Recommendations** | `GET /api/recommendations`, `POST .../accept`, `POST .../reject` |
| **Actions** | Full lifecycle: create, submit, approve, reject, execute, rollback, verify |
| **Settings** | `GET/PUT /api/settings/thresholds`, metric definition versioning |

Full Swagger documentation available at `/api/docs` when backend is running.

---

## Rule Engine

### Alert Rules (9 rules, 4 categories)

| Category | Rule | Trigger | Severity |
|----------|------|---------|----------|
| **Stockout** | Critical Low Stock | days_of_cover < 3 | HIGH |
| **Stockout** | Low Stock Warning | days_of_cover < 7 | MEDIUM |
| **Stockout** | Slow Moving | days_of_cover > 90 + declining | MEDIUM |
| **Ads** | Zero Order Waste | spend > threshold, orders = 0 | HIGH |
| **Ads** | High ACOS | ACOS > threshold for 3+ days | MEDIUM |
| **Ads** | ACOS Anomaly | ACOS deviates > 2 std dev | HIGH |
| **Competitor** | Price Drop | drop > threshold % | HIGH/MED |
| **Competitor** | Rank Surge | rank jumps significantly | MEDIUM |
| **Competitor** | Review Anomaly | daily reviews > 3x average | LOW |

### Action Guardrails

| Parameter | Default |
|-----------|---------|
| Max price change per action | 3% |
| Minimum margin floor | 15% |
| Price change cooldown | 6 hours |
| Max price changes per day | 2 |
| Max budget adjustment | 20% |
| Max batch impact | $5,000 |

---

## Database Schema

27 tables organized into domains:

- **Auth**: company, user, role, permission, role_permission, user_role
- **Commerce**: store, site, store_site_binding, sku_master, competitor, competitor_snapshot
- **Metrics**: metric_def, metric_def_version, config_threshold, metric_snapshot
- **Facts**: sales_fact, ads_fact, inventory_fact
- **Operations**: alert, recommendation, action, approval, execution, rollback
- **Audit**: audit_log (append-only, trigger-protected)

---

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Backend E2E tests
cd backend && npm run test:e2e

# Frontend component tests
cd frontend && npm test
```

**Test coverage**: 19 test files covering services, rule engine, guardrails, approval strategy, verification engine, metric calculations, and frontend components.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Data Layer  │────>│ Strategy     │────>│  Execution      │
│  (Ingestion, │     │ (Rules,      │     │  (Actions,      │
│   OLTP/OLAP) │     │  Models,     │     │   Approval,     │
│              │     │  Recommend)  │     │   Guardrails)   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────┐                │
                    │ Verification │<───────────────┘
                    │ (T+1/T+3    │
                    │  Metrics)    │───> Learning (V3)
                    └──────────────┘
```

**Core Loop**: Signal -> Recommendation -> Action -> Verification -> Learning

---

## Roadmap

- [x] V1: Data unification, alert engine, battle cards, action center
- [ ] V2: New product testing, semi-auto ads, demand forecasting
- [ ] V3: Autonomous execution with guardrails, playbook library

---

## License

MIT
