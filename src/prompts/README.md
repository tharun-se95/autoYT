# Prompt layers guide

Each layer has **one job**. Do not duplicate long rules across layers—update **one** file, then rely on pointers below.

| Layer | File(s) | Responsibility |
|-------|-----------|------------------|
| **A — Content Architect system** | `src/prompts/content-architect/` | Role, brand, persona, pillars, visual language references, **and** how each JSON field should read. Assembled by `build-system-instruction.ts`. |
| **B — Response schema** | `src/app/actions/content-architect.ts` (`IDEA_SCHEMA`) | **Technical** constraints only (length hints, enums, "see system §…"). |
| **C — User message** | `src/app/actions/content-architect.ts` (dynamic `userText`) | Producer **topics** + **count** + reminder to follow the system instruction only. |
| **D — Imagen (pixels only)** | `src/prompts/thumbnail/build-imagen-prompt.ts` | **Visual** scene assembly: visualDescription + overlay. Pulls `channel-visual-style`, `channel-palette`, `host-model-sheet`. |
| **F — Lead Scriptwriter system** | `src/prompts/script-writer/build-system-instruction.ts` | High-quality structured script + phrase-to-frame rhythm + pause markers for TTS. |
| **G — Script JSON schema** | `src/app/actions/script-writer.ts` | Structure only (acts, blocks, bridges); semantics in layer F. |
| **H — Vocal DNA (TTS)** | `src/prompts/vocal-dna.ts` | Performance instructions + pace pause markers. |

## Channel thesis

Every video argues from the core thesis, injected into script layers via `CHANNEL_THESIS` from `src/lib/channel-dna.ts`.

## Content sub-themes (Pillars)

All ideas are categorized under:
- `overthinking` — Decision paralysis, analysis, analytical loops
- `emotional_armor` — Emotional regulation, responses, coping mechanisms
- `identity_clarity` — Values, clarity, self-identity, perspective
- `social_dynamics` — Relationships, boundaries, social connections
- `habit_architecture` — Behavioral habits, routines, intentional actions

## Shared constants

- `src/prompts/shared/host-model-sheet.ts` — **Single** mentor identity string for Content Architect prose, Imagen `CHARACTER LOCK`, and Lead Scriptwriter **[VIS]** lines.
- `src/lib/channel-visual-style.ts` + `src/lib/channel-palette.ts` — Visual comic language + color palette (thumbnails + script **[VIS]** stills).
- `src/lib/channel-dna.ts` — Version, source file, and thesis string.
