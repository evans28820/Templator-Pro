# STACK_AND_ARCHITECTURE.md
# Templator Pro — Technical Stack & System Architecture

---

## 1. PRODUCT DEFINITION

**Type:** Electron desktop application for Windows (primary) and macOS (secondary).
**Users:** Packaging designers at a single company, each running on their own machine.
**Dependency:** Adobe Illustrator must be installed and licensed on the same machine.
**Data scope:** All configuration and output is local to the designer's machine.
**Licence model:** Reserved for future implementation — no licence validation in v1.

---

## 2. TECHNOLOGY STACK

### Enforced (non-negotiable)

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Electron | ^30.x |
| Frontend bundler | Vite | ^5.x |
| UI framework | Vue 3 Composition API | ^3.4 |
| Type system | TypeScript (strict, no `any`) | ^5.4 |
| State management | Pinia (single source of truth) | ^2.x |
| Styling | CSS custom properties + scoped styles | — |
| IPC bridge | Electron contextBridge (contextIsolation: true) | — |

### Supporting libraries

| Purpose | Library |
|---------|---------|
| Excel read/write | ExcelJS ^4.x |
| Config persistence | electron-store ^10.x (typed, encrypted-capable) |
| Job queue | Custom implementation (see Section 5) |
| Canvas rendering | HTML5 Canvas API (no external library) |
| Drag interactions | Custom mouse event handlers (no drag library) |
| Layout math | Web Workers + OffscreenCanvas |

### Explicitly forbidden
- `any` TypeScript type anywhere in the codebase
- `getBoundingClientRect()` in layout calculation logic
- External drag-and-drop libraries (vue-draggable etc.)
- Direct DOM manipulation from Pinia stores
- Synchronous IPC calls from renderer to main process

---

## 3. PROCESS ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│  ELECTRON MAIN PROCESS                                      │
│                                                             │
│  ┌─────────────────┐   ┌──────────────────────────────┐   │
│  │  Express Server  │   │  Illustrator Job Queue       │   │
│  │  localhost:3799  │   │  (concurrency = 1)           │   │
│  │                  │   │  - Watchdog timeout: 120s    │   │
│  │  Routes:         │   │  - Kill switch on timeout    │   │
│  │  /scan-ai        │   │  - Status events via IPC     │   │
│  │  /run-jsx        │   └──────────────────────────────┘   │
│  │  /parse-excel    │                                       │
│  │  /generate-excel │   ┌──────────────────────────────┐   │
│  │  /preview-image  │   │  Config Store                │   │
│  │  /config/load    │   │  (electron-store)            │   │
│  │  /config/save    │   │  Per-file JSON configs       │   │
│  │  /dialog/*       │   │  Keyed by MD5(aiFilePath)    │   │
│  └─────────────────┘   └──────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │ contextBridge IPC (typed channels)
┌─────────────────────────────────────────────────────────────┐
│  ELECTRON RENDERER PROCESS                                  │
│                                                             │
│  Vue 3 App                                                  │
│  │                                                          │
│  ├── Pinia Store (single source of truth)                   │
│  │   ├── appStore (navigation, illustrator status)          │
│  │   ├── jobStore (active jobs, queue, progress)            │
│  │   ├── templateStore (scan result, tree, configs)         │
│  │   └── settingsStore (paths, font size, preferences)      │
│  │                                                          │
│  ├── Web Workers                                            │
│  │   ├── layout.worker.ts (Phase 0-6 cascade math)         │
│  │   └── fitcheck.worker.ts (preview fit calculation)       │
│  │                                                          │
│  └── Vue Components                                         │
│      ├── Screen 1: JobSetup                                 │
│      ├── Screen 2: Excel                                    │
│      └── Screen 3: Run                                      │
└─────────────────────────────────────────────────────────────┘
           │ JSX scripts (ES3 strings)
┌─────────────────────────────────────────────────────────────┐
│  ADOBE ILLUSTRATOR (external process)                       │
│  One instance, controlled via JSX                           │
│  Platform: Windows (primary) / macOS (secondary)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. FOLDER STRUCTURE

```
Templator-Pro/
├── electron/
│   ├── main.ts                  # Electron entry, window creation
│   ├── server.ts                # Express server setup + all routes
│   ├── jobQueue.ts              # Illustrator job queue (concurrency=1)
│   ├── configStore.ts           # electron-store wrapper (typed)
│   ├── illustrator/
│   │   ├── runner.ts            # JSX execution + watchdog
│   │   ├── discovery.ts         # Illustrator path detection
│   │   └── waitForOutput.ts     # Stable-write polling
│   └── preload.ts               # contextBridge IPC definitions
│
├── src/
│   ├── main.ts                  # Vue app entry
│   ├── App.vue                  # Root component + screen routing
│   │
│   ├── types/
│   │   ├── index.ts             # All shared TypeScript interfaces
│   │   ├── panel.ts             # PanelConfig, PipelinePhase, RemarkConfig
│   │   ├── scan.ts              # ScanResult, TreeNode, ScannedTextFrame
│   │   ├── job.ts               # OrderRow, JobRow, JobStatus
│   │   └── ipc.ts               # IPC channel type definitions
│   │
│   ├── stores/
│   │   ├── app.store.ts         # Navigation, Illustrator status
│   │   ├── job.store.ts         # Job queue state, row status
│   │   ├── template.store.ts    # Scan result, tree, nodeConfigs, panelConfigs
│   │   └── settings.store.ts    # Paths, font size, UI preferences
│   │
│   ├── workers/
│   │   ├── layout.worker.ts     # Phase 0-6 cascade algorithm
│   │   └── fitcheck.worker.ts   # Real-time fit preview calculation
│   │
│   ├── composables/
│   │   ├── useCanvas.ts         # Canvas pan/zoom/draw logic
│   │   ├── useJobQueue.ts       # Job submission and status polling
│   │   └── useConfigPersist.ts  # Auto-save debounce logic
│   │
│   ├── utils/
│   │   ├── jsxGenerator.ts      # Generates ES3 JSX strings from config
│   │   ├── excelGenerator.ts    # Excel template generation (ExcelJS)
│   │   ├── treeUtils.ts         # TreeNode search, traversal helpers
│   │   └── mathUtils.ts         # Pure math helpers (no DOM)
│   │
│   └── components/
│       ├── layout/
│       │   ├── AppTopBar.vue
│       │   └── ResizeDivider.vue
│       ├── screens/
│       │   ├── ScreenSetup.vue
│       │   ├── ScreenExcel.vue
│       │   └── ScreenBatchRun.vue
│       └── ui/
│           ├── CanvasPreview.vue
│           ├── LayerTree.vue
│           ├── PanelConfigPanel.vue    # Face group config (Bottom/Top/Left/Right)
│           ├── NodeConfigPanel.vue     # Generic node config
│           ├── PipelineEditor.vue      # Global pipeline drag-reorder
│           ├── WidthBreakpointList.vue
│           └── JobStatusCard.vue
│
├── _specs/                      # Reference only — agent reads at phase transitions
│   ├── BUSINESS_LOGIC_SPEC.md
│   ├── UI_AND_TYPES_SPEC.md
│   ├── STACK_AND_ARCHITECTURE.md
│   └── AI_FILE_STRUCTURE.md
│
├── PROJECT_MEMORY.md            # Agent rolling memory (compressed after each phase)
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. JOB QUEUE ARCHITECTURE

The Illustrator job queue is the most critical system component. It enforces:
- **Concurrency = 1**: Only one JSX script runs in Illustrator at any time
- **Watchdog timeout**: 120 seconds per job — kill and mark as error if exceeded
- **Non-blocking UI**: Queue runs in main process, status pushed to renderer via IPC events
- **Multi-template safety**: Designer can configure Template B while Template A's jobs are queued/running

```typescript
// electron/jobQueue.ts — interface contract
interface Job {
  id: string
  jsxContent: string
  rowIndex: number
  templateId: string
  timeoutMs: number          // default 120000
  onProgress: (msg: string) => void
  onComplete: () => void
  onError: (err: string) => void
}

interface JobQueue {
  enqueue(job: Job): void
  cancelAll(templateId: string): void  // cancel all jobs for one template
  readonly status: 'idle' | 'running'
  readonly queueLength: number
}
```

### IPC events (main → renderer)
```
job:progress   { jobId, rowIndex, message }
job:complete   { jobId, rowIndex, outputPath }
job:error      { jobId, rowIndex, error }
job:queue      { queueLength, currentJobId }
```

---

## 6. IPC BRIDGE CONTRACT

All renderer→main communication goes through typed IPC channels defined in `preload.ts`. Direct `ipcRenderer` calls are forbidden in components.

```typescript
// src/types/ipc.ts
interface TemplatorAPI {
  // File dialogs
  openFileDialog(filters: FileFilter[]): Promise<string | null>
  openFolderDialog(): Promise<string | null>
  saveFileDialog(filters: FileFilter[]): Promise<string | null>

  // Illustrator operations (queued)
  scanAiFile(filePath: string): Promise<ScanResult>
  enqueueJob(jsx: string, meta: JobMeta): Promise<string>  // returns jobId
  cancelJobs(templateId: string): Promise<void>

  // Config persistence
  loadConfig(aiFilePath: string): Promise<SavedConfig | null>
  saveConfig(aiFilePath: string, config: SavedConfig): Promise<void>

  // Excel
  parseExcel(buffer: ArrayBuffer): Promise<RawExcelRow[]>
  generateExcel(columns: ExcelColumn[], outputPath: string): Promise<void>

  // Status
  getIllustratorStatus(): Promise<IllustratorInfo>

  // Event listeners
  onJobProgress(cb: (data: JobProgressEvent) => void): () => void
  onJobComplete(cb: (data: JobCompleteEvent) => void): () => void
  onJobError(cb: (data: JobErrorEvent) => void): () => void
}
```

---

## 7. ILLUSTRATOR INTEGRATION RULES

Every generated JSX must begin with:

```javascript
// MUST be first line — prevents Illustrator UI dialogs from blocking execution
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
```

### TIF export settings (production print — do not change)

These settings match the original production script exactly. Resolution and colour
accuracy are non-negotiable for print output.

```javascript
var opts = new ExportOptionsTIFF();
opts.resolution      = 300;                              // 300dpi — print production, never change
opts.imageColorSpace = ImageColorSpace.CMYK;             // CMYK — required for print
opts.antiAliasing    = AntiAliasingMethod.ARTOPTIMIZED;  // vector-optimised anti-aliasing
opts.embedICCProfile = true;                             // embed colour profile for accuracy
opts.lZWCompression  = true;                             // lossless compression — safe for print
```

### TIF performance — known slowness causes and fixes

The slow TIF generation is caused by script behaviour, not export settings.
Do NOT reduce resolution or disable colour conversion.

**Fix 1 — `DONTDISPLAYALERTS` must be the absolute first line of every JSX:**
The original script has 20+ `alert()` calls. When run from Templator, these
dialogues are hidden behind other windows. Illustrator waits silently for an OK
click that never comes. This is the primary cause of unexplained hangs.

```javascript
// Line 1 of every generated JSX — no exceptions
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
```

**Fix 2 — Remove `$.sleep(100)` from the batch loop:**
The original script pauses 100ms per row for progress bar repaints.
Templator handles progress via IPC events — the sleep is not needed.

**Fix 3 — Reuse the TIF document across rows:**
The original script calls `app.documents.addDocument()` for every single TIF export.
Creating and closing documents repeatedly is expensive. Create one TIF document
before the loop, reuse it per row, close it once after all rows complete.

### Watchdog pattern (electron/illustrator/runner.ts)

```typescript
async function runJsx(jsxPath: string, timeoutMs = 120_000): Promise<void> {
  const donePath = jsxPath.replace('.jsx', '.done')
  const errorPath = jsxPath.replace('.jsx', '.error')

  await launchJsx(jsxPath)  // platform-specific (Windows: shell exec, macOS: osascript)

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const interval = setInterval(() => {
      if (fs.existsSync(errorPath)) {
        clearInterval(interval)
        reject(new Error(fs.readFileSync(errorPath, 'utf8')))
      } else if (fs.existsSync(donePath)) {
        clearInterval(interval)
        resolve()
      } else if (Date.now() > deadline) {
        clearInterval(interval)
        reject(new Error(`Job timed out after ${timeoutMs / 1000}s`))
      }
    }, 400)
  })
}
```

---

## 8. WEB WORKER BOUNDARY

The Phase 0–5 cascade algorithm runs in `layout.worker.ts`. It receives a message and returns a result — no DOM access, no Pinia access, pure math.

```typescript
// Worker input
interface LayoutWorkerInput {
  panelConfig: PanelConfig
  boxDimensions: BoxDimensions
  remarks: RemarkConfig[]
  pipeline: PipelinePhase[]
}

// Worker output
interface LayoutWorkerResult {
  success: boolean
  layout: RemarkLayout[]      // final positions + sizes for each remark
  warnings: string[]          // overflow warnings
  phaseReached: number        // which pipeline phase resolved it (0-6)
}
```

The worker is invoked for:
1. **Live preview** — called on every slider/config change (debounced 200ms)
2. **Pre-run validation** — called once per row before enqueueing JSX jobs
3. **JSX generation** — result feeds into the JSX string builder

---

## 9. CONFIG PERSISTENCE

Saved per `.ai` file using `electron-store`. Key = MD5 hash of the absolute file path.

```typescript
// Saved config shape (what gets written to disk)
interface SavedConfig {
  aiFilePath: string
  savedAt: string              // ISO timestamp
  appVersion: string           // for future migration handling
  panelConfigs: Record<string, PanelConfig>
  nodeConfigs: Record<string, NodeConfig>
  fieldConfigs: FieldConfig[]
  globalPipeline: PipelinePhase[]
  globalRowBreakMode: 'locked' | 'fluid'
  scanMeta: {                  // lightweight — NOT the full tree
    artboardWidth: number      // mm
    artboardHeight: number     // mm
    boxType: string
    layerNames: string[]
    previewImagePath: string | null
  }
}
```

Full `tree` and `textFrames` arrays are NOT persisted — they are re-derived on rescan.

---

## 10. DEVELOPMENT PHASES

### Phase 1 — Infrastructure & Data Hub
Acceptance criteria:
- Electron app boots, Vite dev server proxies to Express on port 3799
- All IPC channels defined in `preload.ts` and typed in `ipc.ts`
- Job queue implemented with concurrency=1 and watchdog timeout
- `electron-store` config persistence working (load/save round-trip verified)
- All TypeScript types defined — zero `any`, zero compile errors

### Phase 2 — UI & 2D Canvas Engine
Acceptance criteria:
- Screen 1 renders with three-column layout (canvas / tree / config)
- Canvas loads artwork PNG, draws group overlays at correct positions
- Tree renders full hierarchy, click selects node, canvas zooms to it
- PanelConfigPanel renders for face groups with all controls
- NodeConfigPanel renders for text frames and generic groups
- Pipeline editor renders with drag-reorder and enable/disable
- Config auto-saves on change (debounced 800ms)
- Playwright screenshot test confirms overlay positions are correct

### Phase 3 — Core JSX Engine & Web Worker Math
Acceptance criteria:
- `layout.worker.ts` implements Phase 0–5 cascade (sandbox-tested first)
- `jsxGenerator.ts` produces valid ES3 JSX from panelConfigs + nodeConfigs
- Generated JSX includes `DONTDISPLAYALERTS` as first line
- Generated JSX uses recursive `findGroupByName` (not flat `.groupItems["name"]`)
- TIF export uses production settings (300dpi, CMYK, LZW, embedICCProfile) matching original script
- Sandbox test: input known panel dimensions → verify layout output matches expected

### Phase 4 — Local IO & Illustrator Integration
Acceptance criteria:
- Scan runs, returns full tree + group bounds + PNG preview
- Excel generates with correct columns from fieldConfigs
- Excel import parses correctly (skips rows 1+2, starts at row 3)
- Batch run enqueues all rows, processes one at a time
- Progress updates appear in UI during run
- Per-row output `.ai` files saved correctly
- Master multi-artboard `.ai` created after all rows complete
- TIF files generated with optimised settings
- Error rows flagged, batch continues (never stops)
