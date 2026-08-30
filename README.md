# MillQ

MillQ is a modern restaurant management platform for Vietnam.

The product consists of two deliberately separated capabilities:

1. **Operational Core** — authoritative POS, inventory, purchasing, recipes, payments, audit
2. **Production Intelligence** — recommendations and analytics built on operational facts (future sellable module)

## Repository structure

```text
.
├── apps/
│   ├── api/          # Node.js Operational Core HTTP service
│   └── web/          # React client shell
├── packages/
│   ├── domain/       # Money, quantity, conversion, yield (ADR-0002/0003)
│   └── contracts/    # Operational facts and Intelligence DTOs
├── infrastructure/   # Docker Compose (PostgreSQL local dev)
├── docs/             # Architecture, ADRs, processes
└── tests/            # Cross-cutting test assets (future)
```

## Local development

Requirements: Node.js ≥ 20, pnpm 9, PostgreSQL 16 (Docker Compose **or** local install).

```bash
cp .env.example .env
# Option A: Docker Compose
docker compose -f infrastructure/docker-compose.yml up -d
# Option B: local PostgreSQL with DATABASE_URL matching .env.example

pnpm install --frozen-lockfile
pnpm --filter @millq/api run migrate
pnpm dev
```

- API health: http://localhost:3000/health
- Web shell: http://localhost:5173

## Commands

| Command | Description |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Run API and web in parallel |
| `pnpm test` | Run all package tests |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Typecheck all packages |

## Documentation

- [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md) — product authority
- [`AGENTS.md`](AGENTS.md) — agent operating rules
- [`docs/processes/current-state.md`](docs/processes/current-state.md) — what exists now
- [`docs/decisions/`](docs/decisions/) — ADRs

## Status

Foundation Operational Core (merge candidate after correction): Accepted ADR-0001…0003, **ADR-0006**, **ADR-0007**; typed operational facts; CostValue yield math; fact feed guardrail. Full POS and Block C are not started. Block B (ADR-0004/0005) remains Proposed.
