# BUSINESS_LOGIC_SPEC.md
# Templator — Advanced Marking Automation: Business Logic & Architecture

---

## CONFIRMED DECISIONS

### Output structure
- Each Excel row produces its own individual `.ai` + `.tif` output file
- ALL rows from one batch are ALSO copied into ONE master multi-artboard `.ai` file
- Master output path is a single folder configured in Screen 1 settings (not per-row)
- Original template `.ai` file is NEVER modified — always work on a duplicated layer

### Error handling
- When a panel cannot fit content even at minimum font size → proceed anyway, leave text overflow visible, flag row as warning, continue to next row
- When Priority 1 remark does not fit → same behaviour — proceed, overflow, flag, continue
- Batch always runs to completion automatically — never stops on error
- Future: optional "pause on error" toggle in Run screen (not implemented yet)

### Measurements
- ALL spatial measurements in mm — padding, gaps, panel dimensions, thresholds
- Font sizes in pt (industry standard for typography)

### Pipeline scope
- One global pipeline applies to all panels by default
- Per-panel pipeline override can be enabled — when enabled, that panel inherits a copy of the global pipeline first, then the designer modifies it independently
- Pipeline phases can be individually disabled and reordered

### Row break modes
- Global setting (Locked or Fluid), each panel inherits from global by default
- Designer can override per panel independently
- **Locked Mode:** designer manually assigns which remarks go on Row 1 vs Row 2 via canvas drag interaction
- **Fluid Mode:** script auto-balances remarks across rows for best fit
- Maximum rows: 2 for now — logic must remain open to 3+ in future
- Row assignment is per panel (Left face assignment does not affect Right face)

### Alignment
- The entire remark row group is treated as one block
- Block is aligned Left / Center / Right within the panel safe zone
- Setting is per panel

### Priority direction
- Priority 1 = most important, never delete
- Priority 5 = least important, delete first
- Content shedding order: delete priority 5 → 4 → 3 → 2, never delete priority 1

---

## SECTION 1: OUTPUT ARCHITECTURE

### Per-row output
Each Excel row produces:
- One modified `.ai` file saved to the path in the `FileName` column
- One `.tif` export of the `PrintingLayer` group
- One `.tif` export of `PrintingLayer2` if it exists in that file

### Master multi-artboard output
After all rows are processed, one master `.ai` file is created:
- Saved to `masterOutputPath` configured in Screen 1 settings
- One artboard per processed row
- Each artboard contains the processed artwork for that row
- Artboard named after the `LayerName` column value
- All artboards use A4-ratio sizing (same logic as `createDocumentAndArtboards`)

---

## SECTION 2: PANEL-LEVEL CONFIGURATION

Configuration for face groups operates at the **panel level**, not per individual remark node. The four configurable face panels are: Bottom, Top, Left, Right. The Remark panel (header) has simpler config — enable/disable and field mapping only.

### TypeScript interfaces

```typescript
export type PipelinePhaseType =
  | 'max_font_max_gap'
  | 'shrink_gaps'
  | 'shrink_font'
  | 'row_break'
  | 'hard_scale'
  | 'content_shedding'
  | 'error_alert'

export interface PipelinePhase {
  id: string
  type: PipelinePhaseType
  enabled: boolean
  params: {
    shrinkPercent?: number    // used by shrink_font phase (default: 90)
    targetFontPct?: number    // used by hard_scale phase (default: 100)
  }
}

export interface WidthBreakpoint {
  id: string
  operator: 'less_than' | 'greater_than' | 'less_equal' | 'greater_equal'
  thresholdMm: number
  fontSizePt: number
}

export interface RemarkConfig {
  groupName: string           // e.g. 'LeftRemark1', 'BottomRemark4'
  priority: 1 | 2 | 3 | 4 | 5
  enabled: boolean
  row: number                 // 1 or 2 (used in Locked Mode)
}

export interface PanelConfig {
  face: 'bottom' | 'top' | 'left' | 'right'
  enabled: boolean

  // Safe zone padding — all four directions in mm
  paddingTop: number          // default 3
  paddingBottom: number       // default 3
  paddingLeft: number         // default 3
  paddingRight: number        // default 3

  // Row group alignment within safe zone
  alignment: 'left' | 'center' | 'right'   // default 'center'

  // Gap between remarks within a row
  minGapMm: number            // default 3
  maxGapMm: number            // default 8

  // Font size range in pt
  minFontSizePt: number       // default 7
  maxFontSizePt: number       // default 16

  // Width-based font size overrides
  // Face dimension used: Left/Right = box H, Bottom/Top = box W
  widthBreakpoints: WidthBreakpoint[]

  // Row break configuration
  rowBreakMode: 'locked' | 'fluid'    // inherits from global default
  maxRows: number                      // default 2, keep open to 3+

  // Remark-to-row assignments (Locked Mode only)
  // Key = remark group name, value = row number
  rowAssignments: Record<string, number>

  // Pipeline override
  usePanelPipeline: boolean           // false = use global pipeline
  pipeline: PipelinePhase[]           // populated when usePanelPipeline = true

  // Remarks in this panel, ordered by priority
  remarks: RemarkConfig[]
}
```

### Default global pipeline

```typescript
const DEFAULT_PIPELINE: PipelinePhase[] = [
  { id: 'p0', type: 'max_font_max_gap',  enabled: true, params: {} },
  { id: 'p1', type: 'shrink_gaps',       enabled: true, params: {} },
  { id: 'p2', type: 'shrink_font',       enabled: true, params: { shrinkPercent: 90 } },
  { id: 'p3', type: 'row_break',         enabled: true, params: {} },
  { id: 'p4', type: 'hard_scale',        enabled: true, params: { targetFontPct: 100 } },
  { id: 'p5', type: 'content_shedding',  enabled: true, params: {} },
  { id: 'p6', type: 'error_alert',       enabled: true, params: {} },
]
```

---

## SECTION 3: FONT SIZE & SCALING LOGIC

### Min/Max scaling range
- Script dynamically scales text to fit the panel
- Text size must strictly stay within [minFontSizePt, maxFontSizePt]
- If text cannot fit at minFontSizePt: stop scaling, set overflow visible, flag the row as error and continue processing

### Width-based breakpoints
- Designers can define fixed font sizes based on the physical width of the panel face
- Face dimension: Left/Right panels use box H; Bottom/Top panels use box W
- Example: if face width < 100mm → 12pt; if face width ≥ 100mm → 16pt
- Breakpoints override the maxFontSizePt as the starting font size for that run

---

## SECTION 4: PANEL GEOMETRY & ALIGNMENT

### Safe zone calculation
```
Safe Width  = Panel Width  - paddingLeft - paddingRight
Safe Height = Panel Height - paddingTop  - paddingBottom
```
All text rendering, scaling, and wrapping occurs strictly within this boundary.

### Group alignment
- Alignment (Left, Center, Right) applies to the **entire row group** as a block
- The block is positioned relative to the Safe Area, not individual remarks

---

## SECTION 5: SPACING & ROW MANAGEMENT

### Dynamic gap management
- For rows with multiple remarks, gaps between items are equal
- Script condenses gaps toward minGapMm **before** it begins scaling the font size
- This is enforced by the pipeline phase order

### Row break modes

**Locked Mode:**
- Follows designer's manual row assignments stored in `rowAssignments`
- Designer assigns remarks to rows via drag interaction on the canvas preview
- Row assignment is saved as part of the PanelConfig preset

**Fluid Mode:**
- Script auto-balances remarks across rows to maximise font size
- Maximum rows defined by `maxRows` (default 2, logic open to 3+)

---

## SECTION 6: CONTENT PRIORITY & SHEDDING

### Priority rules
| Priority | Behaviour |
|----------|-----------|
| 1 | Never deleted — if it doesn't fit, trigger overflow + flag |
| 2 | Deleted last during shedding |
| 3 | Deleted third |
| 4 | Deleted second |
| 5 | Deleted first |

### Content shedding execution
- Runs only after all scaling and row-break phases have been attempted
- Removes remarks one at a time starting from priority 5, then retries layout
- Stops shedding when content fits or only priority 1 items remain
- If priority 1 items still don't fit: overflow + flag row, continue batch

---

## SECTION 7: THE LOGIC PIPELINE

### Phase descriptions

| Phase | Type | Description |
|-------|------|-------------|
| 0 | `max_font_max_gap` | Attempt layout at maxFontSizePt + maxGapMm, single row |
| 1 | `shrink_gaps` | Condense gaps to minGapMm, retry layout |
| 2 | `shrink_font` | Shrink font by `shrinkPercent`% (default 90%), retry |
| 3 | `row_break` | Split remarks across rows per rowBreakMode, reset font to max |
| 4 | `hard_scale` | On split rows, shrink font from `targetFontPct`% down to min |
| 5 | `content_shedding` | Remove lowest-priority remarks one at a time, retry each time |
| 6 | `error_alert` | Set overflow visible, flag row as error, continue batch |

### Phase execution rules
- Phases run in sequence; stop at first success
- Disabled phases are skipped
- Phases can be reordered by designer
- `shrinkPercent` and `targetFontPct` are editable per phase
- Phase 6 (error_alert) always runs last if no earlier phase succeeded

### JSX implementation pattern

```javascript
// ES3-compatible JSX — var only, no arrow functions, no const/let
function processPanel(panelName, doc, boxW, boxH, panelCfg, pipeline) {
  var MM = 2.83465;
  var panel = findGroupByName(doc.layers[0], panelName);
  if (!panel || !panelCfg.enabled) return;

  var safeW = (panel.width  / MM) - panelCfg.paddingLeft - panelCfg.paddingRight;
  var safeH = (panel.height / MM) - panelCfg.paddingTop  - panelCfg.paddingBottom;

  var remarks = getActiveRemarks(panel, panelCfg);
  var faceDim = (panelName === 'Left' || panelName === 'Right') ? boxH : boxW;
  var targetFont = getBreakpointFont(faceDim, panelCfg) || panelCfg.maxFontSizePt;

  for (var pi = 0; pi < pipeline.length; pi++) {
    var phase = pipeline[pi];
    if (!phase.enabled) continue;

    var result = runPhase(phase, remarks, safeW, safeH, targetFont, panelCfg);

    if (result.fits) {
      applyLayout(panel, result.layout, panelCfg);
      return;
    }
    if (result.updatedRemarks) remarks = result.updatedRemarks;
    if (result.updatedFont)    targetFont = result.updatedFont;
  }

  applyOverflowState(panel, remarks, panelCfg);
}
```

---

## SECTION 8: BARCODE HANDLING

- Manual rotation UI is removed
- Script auto-detects panel position and applies correct rotation:
  - Side panels (Left/Right) → rotate ±90°
  - Top/Bottom panels → rotate 0° or 180° based on XYPoint orientation

---

## SECTION 9: PINIA STORE ADDITIONS

```typescript
// New state fields to add to the app store
globalPipeline:      PipelinePhase[]              // default = DEFAULT_PIPELINE
globalRowBreakMode:  'locked' | 'fluid'           // default 'locked'
globalMaxRows:       number                        // default 2
panelConfigs:        Record<string, PanelConfig>  // keyed by face name
masterOutputPath:    string                        // master .ai output folder

// Actions
setPanelConfig(face: string, updates: Partial<PanelConfig>): void
applyPanelConfigToAll(sourceFace: string, fields: (keyof PanelConfig)[]): void
enablePerPanelPipeline(face: string): void  // copies globalPipeline into panel first
initPanelConfigsFromScan(tree: TreeNode[]): void  // auto-populate from scan result
updateGlobalPipeline(phases: PipelinePhase[]): void
```

### initPanelConfigsFromScan behaviour
- Runs after every successful scan
- For each face (Bottom/Top/Left/Right): if no PanelConfig exists yet, create one with defaults
- Auto-populate `remarks[]` from the face group's children in the scan tree
- Existing PanelConfig entries are preserved (not overwritten)
