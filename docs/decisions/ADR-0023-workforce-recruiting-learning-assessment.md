# ADR-0023: Workforce / Recruiting / Learning / Assessment

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-12
- **Accepted:** 2026-09-12 (PO architecture delta)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, [ADR-0015](ADR-0015-privacy-residency-security.md) (Accepted — privacy / egress / assessment media vs voice), [ADR-0020](ADR-0020-intelligence-execution-model-gateway.md) (Accepted — Intelligence assists, does not decide employment), [ADR-0021](ADR-0021-voice-multilingual-interaction.md) (Accepted — transient voice ≠ assessment audio), [ADR-0024](ADR-0024-allergen-dietary-constraint-resolution.md), Workforce, Identity & Access, Catalog / Menu / Recipes (projections only)

## Context

KiU needs recruiting, learning, and assessment as first-class people workflows without giving candidates Operational Core access, without letting AI hire/fire, and without treating assessment audio as transient Voice Interaction (ADR-0021).

## Decision

### 1. Identity separation

`Candidate` ≠ `Employee` ≠ `User Account`.

A Candidate must **not** automatically receive Operational Core access.

### 2. Lifecycle

```text
Vacancy
  → Candidate
  → Application
  → Interview / Screening
  → Training Enrollment
  → Learning
  → Assessment
  → Human Employment Decision
  → Employee
  → optional User / Role / Scope
```

### 3. Recruiting concepts

Architecture must support:

- Vacancy;
- Candidate;
- Application;
- InterviewQuestionnaire;
- WrittenAnswer;
- VoiceAnswer;
- ScreeningResult / Recommendation;
- Human reviewer decision.

### 4. Learning

Support:

- Course;
- Module;
- Lesson;
- TrainingAssignment;
- Progress.

Content classes:

| Class | Meaning |
| --- | --- |
| **A** | Business-private content |
| **B** | MillQ Library / generic content |

Marketplace remains **future**.

### 5. Assessment

Support:

- QuestionBank;
- ExamVersion;
- AssessmentAttempt;
- written / audio submissions;
- scoring;
- thresholds;
- retakes;
- result history.

A historical attempt must remain tied to the **exact** exam / content version used.

### 6. Menu / Catalog integration

Workforce may **consume** authorized Menu / Catalog / Recipe / Allergen projections.

It does **NOT** own those sources of truth (see ADR-0024 for allergen ownership).

### 7. Employment decision safety

AI / automation **MAY**:

- score;
- classify answers;
- detect gaps;
- recommend;
- produce evidence / explanations.

AI / automation **MUST NOT** autonomously:

- hire;
- reject;
- terminate;
- reduce compensation;
- remove shifts;
- make equivalent material employment decisions.

Final material employment decision requires **authorized human action + audit**.

(Compatible with ADR-0006 / ADR-0020: Intelligence does not own Core employment truth or mutate it without a normal authorized command path.)

### 8. Qualification ≠ employment

Training / assessment qualification is separate from:

- employment status;
- salary;
- payroll;
- compensation.

Do **not** infer compensation changes automatically from assessment results.

### 9. Restricted hire / retake

Architecture may represent outcomes such as:

- Hire;
- HireWithRestriction;
- RetakeRequired;
- Reject;
- Probation;

but the final decision remains **human-controlled**.

### 10. Assessment audio

Assessment / interview audio is **different** from transient ADR-0021 voice interaction.

It may be retained as evidence under explicit:

- purpose;
- consent / legal basis;
- retention policy;
- deletion policy;
- reviewer permissions;
- transcription policy;
- egress policy (ADR-0015 Egress Gate).

Do **not** apply ADR-0021 zero-retention blindly.

### 11. Acceptance scope

Acceptance does **NOT** mean:

- recruiting portal implemented;
- AI scoring implemented;
- automated hiring implemented;
- course marketplace implemented.

## Consequences

- Workforce module expands beyond PersonalShift / Employee to recruiting, learning, and assessment boundaries.
- Assessment media policy is owned here under ADR-0015 Privacy Control Plane — not under Voice Interaction.
- Allergen / menu training content is projection-only (ADR-0024).

## Alternatives considered

- Auto-provision Candidate as User with Core access — rejected.
- AI autonomous hire / reject / terminate — rejected.
- Infer compensation from assessment scores — rejected.
- Blind ADR-0021 zero-retention for assessment audio — rejected.
- Workforce owns Catalog / Recipe / Allergen truth — rejected.
- Course marketplace in this ADR — deferred.
