# ADR-0021: Voice & Multilingual Interaction Boundary

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-12
- **Accepted:** 2026-09-12 (PO strategic review — intent classes)
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
  → interaction class A | B | C | D (below)
  → (if command class) authorization / confirmation per policy
  → normal application command (command classes only)
  → audit
```

### Interaction classes

| Class | Name | Behavior |
| --- | --- | --- |
| **A** | **Informational query** | Questions to Intelligence / read models (e.g. EvidenceBuilder). **No** domain command. **No** command confirmation required. |
| **B** | **Translation** | Speech/text translation between supported languages. **No** domain command. **No** command confirmation required. |
| **C** | **Command preview** | Voice intent resolves to a structured `VoiceCommandPreview`. Normal authorization / AuthorizationPolicy applies. Confirmation according to **command policy** for that command. |
| **D** | **Critical command** | High-risk intents (examples: refund; reversal; inventory adjustment / write-off; sensitive financial operation). **Must** require: explicit confirmation; authorization; reason where AuthorizationPolicy requires it; normal domain command; audit. |

Voice / LLM / ASR **must never** execute Operational Core mutations directly. Classes C and D always land on normal application commands after policy gates; classes A and B never mutate Core.

### Language policy (MVP)

| Language | Speech input | Written output | TTS |
| --- | --- | --- | --- |
| **Vietnamese** | Required | Written Vietnamese for local employee | **NOT** required in MVP |
| **English / Russian** | Supported | Guest-facing text | Optional guest-facing TTS |
| Chinese / Korean / Thai | Future language/provider packs | Same boundary | Future |

### Foreign service flow (examples)

Guest EN/RU speech → ASR → menu-aware interpretation/translation → **written Vietnamese** to employee → structured order preview if applicable (class B and/or C).

Vietnamese employee speech → Vietnamese ASR → translation → EN/RU text + optional TTS for guest (class B).

Owner operational question → Informational query (class A) via EvidenceBuilder / ModelGateway (ADR-0020).

### Safety invariants

- ASR / LLM **never** mutate Operational Core.
- Voice **never** bypasses RBAC / AuthorizationPolicy.
- Critical intents (class **D**) require **explicit confirmation**, authorization, reason when policy requires it, normal domain command, and audit.
- Low-confidence recognition ⇒ **NO command**.
- Menu/order interpretation resolves through **Catalog / Menu / modifiers / availability**, not unconstrained free-text hallucination.
- **Push-to-talk first**; wake-word later.
- **No** voiceprint / speaker identification by default.
- **Raw audio zero-retention by default** after processing (ADR-0015 data-processing paths).
- Transcript retention only under explicit retention / business policy.
- External speech/model providers go through ADR-0015 **Egress Gate** (and ModelGateway / registry when models are involved — ADR-0020).
- Voice unavailable offline **does not** block POS / KDS / printing (ADR-0018).
- **No** large local speech/LLM model required on the restaurant device for MVP.
- **Qwen3-ASR 0.6B / 1.7B** (and similar) are **benchmark candidates**, not architecture invariants.

### Module placement

Inside the modular monolith as a supporting interaction path:

```text
Voice & Multilingual Interaction
  → ModelGateway / SpeechProviderAdapter (ADR-0020)
  → existing application commands (Orders, etc.)  [classes C/D only]
```

No new deployable / microservice required by this ADR.

## Consequences

- VoiceSession tables, ASR runtime, TTS, and ModelGateway implementation are deferred.
- Offline POS remains fully usable without voice/AI connectivity.
- UI/UX for confirmation differs by class; Core mutation path remains identical to non-voice commands.

## Alternatives considered

- Voice as direct command executor without preview/confirmation — rejected.
- Treating all voice intents as requiring the same confirmation — rejected (A/B vs C/D).
- On-device mandatory ASR/LLM for MVP — rejected.
- Wake-word + continuous listening as MVP default — rejected.
- Voiceprint identification — rejected by default.

## LEGAL GATES

- Cross-border ASR/TTS providers require Egress Gate (ADR-0015).
- Retention of transcripts/audio beyond zero-retention default requires explicit policy / legal review.
