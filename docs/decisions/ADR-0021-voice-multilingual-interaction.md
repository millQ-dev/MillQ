# ADR-0021: Voice & Multilingual Interaction Boundary

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-12
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, [ADR-0015](ADR-0015-privacy-residency-security.md), [ADR-0018](ADR-0018-offline-multiplatform-runtime.md), [ADR-0020](ADR-0020-intelligence-execution-model-gateway.md)

## Context

Voice and multilingual assistance are first-class supporting capabilities for KiU (Vietnamese operations + EN/RU guest communication). They must not become a bypass of RBAC, domain commands, Catalog/Menu resolution, or offline POS reliability.

## Decision

### Role

Voice is a **supporting interaction capability**, not a bypass business-command system and not an owner of Orders / Inventory / Payments truth.

### Pipeline

```text
Device microphone
  → push-to-talk / local VAD
  → server-side ASR
  → language / intent / translation router
  → one of:
       a) Translation response
       b) VoiceCommandPreview
       c) Owner question → EvidenceBuilder (ADR-0020)
  → authorization / confirmation
  → normal application command
  → audit
```

### Language policy (MVP)

| Language | Speech input | Written output | TTS |
| --- | --- | --- | --- |
| **Vietnamese** | Required | Written Vietnamese for local employee | **NOT** required in MVP |
| **English / Russian** | Supported | Guest-facing text | Optional guest-facing TTS |
| Chinese / Korean / Thai | Future language/provider packs | Same boundary | Future |

### Foreign service flow (examples)

Guest EN/RU speech → ASR → menu-aware interpretation/translation → **written Vietnamese** to employee → structured order preview if applicable.

Vietnamese employee speech → Vietnamese ASR → translation → EN/RU text + optional TTS for guest.

### Safety invariants

- ASR / LLM **never** mutate Operational Core.
- Voice **never** bypasses RBAC / AuthorizationPolicy.
- Critical intents require **explicit confirmation** and normal authorizer rules.
- Low-confidence recognition ⇒ **NO command**.
- Menu/order interpretation resolves through **Catalog / Menu / modifiers / availability**, not unconstrained free-text hallucination.
- **Push-to-talk first**; wake-word later.
- **No** voiceprint / speaker identification by default.
- **Raw audio zero-retention by default** after processing (ADR-0015 data-processing paths).
- Transcript retention only under explicit retention / business policy.
- External speech/model providers go through ADR-0015 **Egress Gate**.
- Voice unavailable offline **does not** block POS / KDS / printing (ADR-0018).
- **No** large local speech/LLM model required on the restaurant device for MVP.
- **Qwen3-ASR 0.6B / 1.7B** (and similar) are **benchmark candidates**, not architecture invariants.

### Module placement

Inside the modular monolith as a supporting interaction path:

```text
Voice & Multilingual Interaction
  → ModelGateway / SpeechProviderAdapter (ADR-0020)
  → existing application commands (Orders, etc.)
```

No new deployable / microservice required by this ADR.

## Consequences

- VoiceSession tables, ASR runtime, TTS, and ModelGateway implementation are deferred.
- Offline POS remains fully usable without voice/AI connectivity.

## Alternatives considered

- Voice as direct command executor without preview/confirmation — rejected.
- On-device mandatory ASR/LLM for MVP — rejected.
- Wake-word + continuous listening as MVP default — rejected.
- Voiceprint identification — rejected by default.

## LEGAL GATES

- Cross-border ASR/TTS providers require Egress Gate (ADR-0015).
- Retention of transcripts/audio beyond zero-retention default requires explicit policy / legal review.
