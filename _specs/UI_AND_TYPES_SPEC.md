# UI_AND_TYPES_SPEC.md
# Templator — UI Specification & TypeScript Types

---

## SCREEN 1: JOB SETUP — LAYOUT

After a successful scan, Screen 1 has the following sections in order:

```
[Collapsed header bar]
[Preview section — three columns]
[Detected text fields — section 3]
[Pipeline — section 5]
[Settings — section 4]
[Generate Excel template →]
```

### Collapsed header bar (after scan)
```
✓  Posheen Barcode Sample Marki...  [TOP OPEN]  2200 × 3111.4 mm  · Saved X ago
                                              [Change file]  [Rescan]
```
- Height: ~40px
- Clicking "Change file" clears scan result and shows full sections 1+2
- Clicking "Rescan" triggers a fresh scan, keeps current file

### Preview section — three columns
```
┌─────────────────────────┬──────────────────┬──────────────────────────┐
│  CANVAS PREVIEW  (42%)  │  LAYER TREE (28%)│  CONFIG PANEL    (30%)   │
│                         │                  │                          │
│  Artwork PNG            │  Full hierarchy  │  Shows config for        │
│  + group overlays       │  tree            │  selected node           │
│  + row lines when       │                  │  (see CONFIG PANEL       │
│    face selected        │                  │   SPEC below)            │
└─────────────────────────┴──────────────────┴──────────────────────────┘
```
- Three columns separated by draggable dividers
- Canvas column: contains toolbar (− Fit + zoom% badge) + canvas element
- Canvas fills all remaining height with no empty space below
- Tree column: overflow-y auto
- Config column: overflow-y auto

---

## CANVAS PREVIEW SPEC

### Group overlays
Each named group with a bounding box is drawn as a semi-transparent overlay:

| Group | Stroke colour | Fill (normal) | Fill (hover) | Fill (selected) |
|-------|--------------|---------------|--------------|-----------------|
| Remark | #534AB7 | rgba(83,74,183,0.08) | rgba(83,74,183,0.18) | rgba(83,74,183,0.28) |
| Bottom/Top | #0F6E56 | rgba(15,110,86,0.08) | rgba(15,110,86,0.18) | rgba(15,110,86,0.28) |
| Left/Right | #185FA5 | rgba(24,95,165,0.08) | rgba(24,95,165,0.18) | rgba(24,95,165,0.28) |
| LOGO | #888780 | rgba(136,135,128,0.06) | rgba(136,135,128,0.14) | not selectable |
| Other named | #888780 | transparent | rgba(136,135,128,0.10) | rgba(136,135,128,0.20) |

### Selected node highlight
When any tree node is selected:
- Draw a dashed purple border (#534AB7) around its bounding box
- Fill: rgba(83,74,183,0.15)
- Label the node name above the box in 11px purple text
- Animate zoom to center the selected node (300ms ease-in-out)

### Row assignment overlay (Locked Mode)
When a face group is selected AND `rowBreakMode === 'locked'`:
- Draw a horizontal dashed line (#B4B2A9) dividing the face into Row 1 (top) and Row 2 (bottom)
- Label "Row 1" and "Row 2" in 9px gray text at the left edge of each area
- Each remark shows a small badge "R1" or "R2" at its canvas position

### Canvas navigation
- **Zoom:** Ctrl + scroll wheel — zooms toward cursor position
- **Pan:** Left-click drag on empty canvas area (no group hit)
- **Middle mouse:** Always pans
- **Double-click empty area:** Fit to canvas (resetView)
- **Ctrl+0:** Fit to canvas
- **Fit button:** Fit to canvas
- **+/− buttons:** Zoom by 10% toward canvas center
- Cursor: pointer over clickable group, grab over empty area, grabbing while panning

### Canvas hint text
Shown in bottom-left corner of canvas in 8px gray:
`Ctrl+scroll zoom  •  drag to pan  •  double-click to fit`
Disappears after first user interaction with the canvas.

---

## LAYER TREE SPEC

### Node display rules

| Node type | Icon | Label | Style |
|-----------|------|-------|-------|
| GroupItem (named) | 囧 | node.name | Normal |
| GroupItem (unnamed) | 囧 | `<unnamed>` | Gray italic |
| TextFrame (named) | T | node.name + content preview | Normal |
| TextFrame (unnamed, has content) | T | content (first 20 chars) | Gray italic |
| TextFrame (unnamed, empty) | T | `<empty text frame>` | Gray italic |
| PathItem / CompoundPathItem | ● | node.name or `<path>` | Gray |
| Paths summary | ● | `Paths (N)` | Gray italic, collapsed |

### Path summarisation rule
If a group contains ONLY unnamed PathItems/CompoundPathItems with no named descendants:
- Collapse all paths into a single summary row: `● Paths (N)` where N = count
- Not expandable, not selectable for config

### Tree indicators (right side of each row)
- `E` badge: node has `includeInExcel: true`
- `↔` badge: node has `canShrink: true`
- `●` dot: node config differs from smart default
- `–` dash: click to collapse children (shown on expanded groups)

### Auto-expand rules on load
- Remark: expanded
- PrintingLayer: expanded
- All others: collapsed

### Row interaction
- Click: select node, update config panel, zoom canvas to node
- Clicking already-selected node: deselects
- Hover: subtle background highlight

---

## CONFIG PANEL SPEC

The right config panel adapts based on the selected node type.

### Face group panel (Bottom / Top / Left / Right)
Shows `PanelConfigPanel` component. See BUSINESS_LOGIC_SPEC.md Section 2 for the PanelConfig interface.

```
● [Face name]                    GroupItem
[W] × [H] mm
──────────────────────────────────────────
ENABLED                          [Yes/No toggle]

SAFE ZONE PADDING (mm)
  ┌──────────────────────────┐
  │       Top  [___]         │
  │  Left [___]  Right [___] │
  │     Bottom  [___]        │
  └──────────────────────────┘

ALIGNMENT
  [Left]  [● Center]  [Right]    (three-pill toggle)

GAP BETWEEN REMARKS
  Min [___] mm        Max [___] mm

FONT SIZE
  Min [___] pt        Max [___] pt

WIDTH BREAKPOINTS                [+ Add rule]
  if face width [< ▾] [___] mm → [___] pt  [×]
  (note below: "Left/Right = box H, Bottom/Top = box W")

ROW BREAK
  Mode [Locked ▾]    inherits from global
  Max rows [2]

REMARKS                          (drag ⠿ to reorder)
  ⠿  RemarkName    P[1▾]    Row[1▾]    [● enabled]
  (row dropdown greyed out when rowBreakMode = 'fluid')

PIPELINE
  [Use panel pipeline: No ▾]
  "Using global pipeline"    (when No)
  (draggable phase list)     (when Yes — copy of global)

──────────────────────────────────────────
[Apply padding to all faces]
[Apply font range to all faces]
[Copy ALL settings to all faces]
```

### Generic GroupItem panel (not a face group)
```
[GroupName] or [<unnamed>]       GroupItem
[W] × [H] mm
──────────────────────────────────────────
ENABLED                          [Yes/No]

SIZING RULES
Can shrink to fit                [Yes/No]
  Shrink mode   [Proportional ▾]     (if canShrink)
  Minimum size  [slider] [___] mm    (if canShrink)

TEXT WRAP
Allow 2-line wrap                [Yes/No]

PRIORITY
Priority among siblings          [1][2][3][4][5]

EXCEL
Include in Excel                 [Yes/No]
  Column label  [_____________]      (if included)

[Apply to all siblings]
[Apply to all faces]             (only if inside Left/Right/Top/Bottom)
```

### TextFrame (named) panel
```
[FieldName]                      TextFrame
Current content: "[value]"
──────────────────────────────────────────
ENABLED                          [Yes/No]

EXCEL
Include in Excel                 [Yes/No]
  Column label  [_____________]

SIZING
Can shrink font                  [Yes/No]
  Min font size [slider] [___] pt    (if canShrink)

[Apply same rules to matching field names in other faces]
```

### TextFrame (unnamed / static) panel
```
[<unnamed>]                      TextFrame — static label
Content: "[value]"
──────────────────────────────────────────
This is a static design element.
It will not be modified by the script.
```

### PathItem panel
```
[name or <path>]                 PathItem
[W] × [H] mm
──────────────────────────────────────────
This is a graphic element — not configurable.
```

### No selection state
```
○
Click any item in the layer tree or click on the canvas
```

---

## PIPELINE SECTION SPEC (Section 5 in Screen 1)

Appears as a collapsible section below the preview section, above Settings.

```
5  PIPELINE                                         [▼]

   Global pipeline — applies to all panels unless overridden

   [Global row break: Locked ▾]    [Max rows: 2]

   <!-- UI note: pipeline has 7 internal phases (0-6). Phase 1 (shrink_gaps)
        and Phase 2 (shrink_font) are merged into one UI row for compactness.
        The [90]% control drives shrinkPercent on the shrink_font phase. -->
   ⠿  ✓  Phase 0   Max font + max gap (single line)
   ⠿  ✓  Phase 1   Shrink gaps to min → shrink font to [90] %
   ⠿  ✓  Phase 2   Row break
   ⠿  ✓  Phase 3   Reset font to [100] % on two rows → shrink to min
   ⠿  ✓  Phase 4   Content shedding (priority 5 → 2)
   ⠿  ✓  Phase 5   Overflow + flag as error

   [Reset to defaults]
```

- ✓/✗ toggle: enables/disables the phase (disabled phases are skipped)
- ⠿ handle: drag to reorder phases
- [90] and [100]: inline editable number inputs
- Drag uses mousedown → mousemove → mouseup (no drag library required)

---

## SETTINGS SECTION SPEC (Section 4 in Screen 1)

```
4  SETTINGS

   Icon library (.ai)
   [Path to month-icon .ai file...                     ] [Browse]

   Output folder (individual files)
   [Where to save individual .ai + .tif files...       ] [Browse]

   Master output path (all artboards combined)
   [Where to save the master multi-artboard .ai file...] [Browse]
```

All three Browse buttons call `GET /dialog/folder`.

---

## DETECTED TEXT FIELDS SPEC (Section 3 in Screen 1)

```
3  DETECTED TEXT FIELDS
   Unnamed frames are skipped (static design elements). Grey = read-only.

   In Excel?  Field name       Current content        Notes
   ─────────────────────────────────────────────────────────
   [✓]        POLayer          20253614(H2-2505...)
   [✓]        QTYLayer         15
   [✓]        DeliveryLayer    30/06/2025
   [ ]        YPoint           5               Auto-calculated registration point
   [ ]        XPoint           0               Auto-calculated registration point
   [–]        Type             TOP OPEN        Read-only — box type identifier
   [✓]        MonthLayer       (empty)  ⚠      Month 1–12, triggers icon replacement
```

- `YPoint`, `XPoint`: unchecked by default, note shown
- `Type`: greyed out, locked, note shown
- `MonthLayer`: if not found in scan, added automatically as optional field with warning
- Fields with empty content show ⚠ amber warning icon

---

## SCREEN 2: EXCEL SPEC

### Column pills display
Each column is shown as a pill tag:
- Purple border: `filePath` (always first)
- Default: all scanned text frame names
- Green badge `Y/N`: group visibility columns
- Teal: L, W, H dimension columns
- Special fields: `LayerName`, `FileName` always last

### Import flow
1. Designer drops or browses an `.xlsx` file
2. File read as `ArrayBuffer` via `FileReader` in browser
3. Send as `application/octet-stream` to `/parse-excel`
4. Parser skips Row 1 (headers) and Row 2 (description) — data starts Row 3
5. On success: show `✓ filename.xlsx — N rows loaded` + enable Run button
6. On validation error: show specific error messages per row, allow "Continue anyway" for non-critical errors

### Validation rules
- `Artwork File`: required, cannot be empty
- `Layer Name`: required, cannot be empty
- `Length (mm)`, `Width (mm)`, `Height (mm)`: must be positive numbers
- All other fields: optional, empty is acceptable

---

## SCREEN 3: RUN SPEC

### Row card states
| Status | Border colour | Pill label |
|--------|--------------|------------|
| pending | gray | Ready |
| running | purple | Running... |
| done | green | Done ✓ |
| warning | amber | Warning ⚠ |
| error | red | Error ✗ |

### Warning vs Error distinction
- **Warning:** content overflow occurred (something didn't fit, was left visible)
- **Error:** JSX script crashed or file not found — output may be incomplete

### After run completes
- Show summary: `3 done  0 warnings  0 errors`
- Each done row shows the output file path
- Each warning/error row shows the specific message
- [Open output folder] button

---

## IMPORTANT IMPLEMENTATION RULES

- All spatial measurements displayed and stored in mm
- Font sizes displayed and stored in pt
- JSX output must be ES3-compatible: `var` only, no arrow functions, no `const`/`let`, no destructuring, no `Array.forEach`, no `Object.keys` — use `for` loops
- Helper functions from `Repeat_Order_for_WeiTai_Kitchen__NEW_XYPoint_.jsx` must be copied verbatim into generated JSX — do not rewrite them
- Icon library path is configurable — never hardcode `Y:/AI Department...`
- Text frames without a `.name` property are static design elements — never modify them
- `PrintingLayer2` is optional — handle its absence gracefully
- The original template `.ai` file is never modified — all changes go into a new duplicated layer
