# AGENT RULES: Templator Pro Operations

## Knowledge Base Policy
- Rely primarily on `PROJECT_MEMORY.md` and `AGENTS.md`.
- STRICTLY FORBIDDEN to read the `_specs/` directory on every action to save tokens.
- Only read `_specs/` when moving to a new Phase, or when implementing the core Phase 0-6 cascade algorithm.

## Architectural Red Lines (CRITICAL)
- **Stack**: Electron + Vite + Vue 3 (Composition API) + TypeScript
- **State**: Pinia (Strictly as the Single Source of Truth).
- **Illustrator IPC Integration**:
  - MUST enforce Concurrency = 1 (Job Queue) for all Adobe tasks.
  - MUST implement a Watchdog Timeout (120s kill switch) to prevent Adobe from hanging the app.
  - MUST inject `app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;` in JSX.
- **Frontend Performance**:
  - Heavy layout cascades (Phase 0-6) MUST be offloaded to Web Workers.
  - UI Drag interactions MUST use local state and only commit to Pinia on `dragend` (Debouncing).
  - DOM measuring (`getBoundingClientRect`) is forbidden in layout logic. Use purely mathematical approaches or `OffscreenCanvas`.

## Development Roadmap
- Phase 1: Infrastructure & Data Hub 
- Phase 2: UI & 2D Canvas Engine
- Phase 3: Core JSX Engine & Web Worker Math
- Phase 4: Local IO & Illustrator Integration