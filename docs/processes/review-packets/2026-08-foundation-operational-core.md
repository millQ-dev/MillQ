# Review packet — Foundation Operational Core

Дата: 2026-08-30  
Ветка: `feature/foundation-operational-core`  
Tip: `27ff2d9`  
Base: `main` @ `f568789`

Ниже — готовый текст для копирования в ChatGPT.

---

```text
=== ПАКЕТ ДЛЯ CHATGPT (безопасный handoff) ===
Проект: MillQ
Роль получателя: стратегический ревьюер / помощник Product Owner
Задача: оценить блок перед merge и сказать: approve / правки / блокеры

1) Цель блока
Собрать фундамент продукта без полноценного POS:
- согласовать модель «Operational Core + Production Intelligence»
- зафиксировать карту модулей и модель исторической правды
- реализовать общую математику денег/единиц/выхода (yield)
- завести контракты операционных фактов и границу Intelligence
- сделать запускаемый каркас monorepo (API + Web + PostgreSQL compose)
- описать offline-основание без выдумывания фискальных правил Вьетнама

2) Ссылки
- Branch: feature/foundation-operational-core
- Tip commit: 27ff2d9
- Base: main @ f568789
- PR: ещё не создан (https://github.com/millQ-dev/MillQ/pull/new/feature/foundation-operational-core)
- Issue: не привязан явно в этом блоке — риск процесса
- Checkpoint: docs/processes/current-state.md
- Шаблон ритуала: docs/processes/chatgpt-review-packet-template.md

3) Контекст продукта (кратко)
MillQ — платформа управления рестораном для Вьетнама (русские собственники / вьетнамская операционка).
Долгосрочно два слоя:
1) Operational Core — единственный источник операционной правды (продажи, склад, закупки, рецепты, аудит)
2) Production Intelligence — рекомендации и аналитика поверх фактов; не переписывает склад/продажи/деньги молча
Стек уже принят: TypeScript monorepo, React, Node modular monolith, PostgreSQL (ADR-0001).
Деньги/единицы/yield приняты (ADR-0002, ADR-0003).

4) Что сделано в этом блоке
Документы:
- operational-core-and-intelligence.md
- domain-module-map.md (~17 модулей)
- historical-truth-model.md
- offline-foundation.md
- implementation-scaffolding.md (временные выборы каркаса)
- ADR-0006 Production Intelligence boundary — статус Proposed
Код:
- packages/domain — Money, Quantity, конверсия упаковок, нормализация yield/cost
- packages/contracts — конверты операционных фактов, DTO рекомендаций, in-memory идемпотентный store
- apps/api — Fastify, /health, env validation, SQL migrations runner
- apps/web — React/Vite shell
- infrastructure/docker-compose.yml — PostgreSQL 16 local
Тесты домена: упаковки→литры/кг, штуки, отказ несовместимых единиц, инварианты себестоимости yield; идемпотентность фактов.

5) Что сознательно НЕ сделано
- полный POS / меню / оплаты / складской workflow end-to-end
- микросервисы / Kafka
- «фейковый ИИ» и внешние LLM API
- фискальные правила Вьетнама
- принятие ADR-0006 (оставлен Proposed)
- merge Block B (ADR-0004/0005 остаются на draft-ветке)
- выбор финального ORM / auth / offline sync protocol

6) Решения
- Accepted (не ломались): ADR-0001, ADR-0002, ADR-0003
- Proposed (нужно решение PO): ADR-0006; также открыт Block B (ADR-0004/0005, вопросы B-01–B-18)
- Scaffolding (временно, не Accepted ADR): pnpm, Fastify, Vite+React, Zod, decimal.js, plain SQL migrations

7) Проверки
- Тесты: domain 10 OK, contracts 2 OK, api config 1 OK
- Build + typecheck: OK
- API /health поднимается; без Postgres отвечает degraded/database=down (ожидаемо)
- Не проверялось в среде агента: Docker/Postgres migrate end-to-end (Docker недоступен)
- CI на GitHub для этой ветки: не подтверждён в пакете

8) Риски и вопросы к Product Owner
- Принимаем ли ADR-0006 как есть?
- Мерджим ли foundation-код до принятия Block B, или сначала согласовать карту модулей с PR #12?
- Нужен ли отдельный Issue под этот блок до merge (правило репозитория: work linked to Issue)?
- Утверждаем ли scaffolding (Fastify/Vite/Zod/decimal.js) или требуем короткий ADR «Accepted with scaffolding choices»?
- Следующий блок — Block C (persist facts + GoodsReceived vertical) — ок?

9) Рекомендация агента-исполнителя
- Архитектурные docs + ADR-0006 Proposed — можно ревьюить и мерджить как foundation docs/code вместе, ЕСЛИ PO согласен, что scaffolding — обратимый каркас.
- Не считать блок «готовым продуктом»: это фундамент.
- Не merge в main без явного вердикта ChatGPT-ревьюера + Product Owner.

10) Просьба к ChatGPT-ревьюеру
Ответь структурировано:
A. Вердикт: APPROVE / APPROVE WITH CHANGES / BLOCK
B. Почему (2–5 пунктов)
C. Обязательные правки до merge (если есть)
D. Можно ли мерджить этот foundation block целиком, или дробить (docs vs code)?
E. Что должно войти в следующее ТЗ / следующий блок (желательно Block C или коррекция)
=== КОНЕЦ ПАКЕТА ===
```
