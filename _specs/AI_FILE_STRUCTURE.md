# AI_FILE_STRUCTURE.md
# Templator Pro — Adobe Illustrator File Structure Reference

This document defines the expected `.ai` file structure that Templator Pro operates on.
It is a contract, not a discovery log. The app adapts to any valid structure via scanning,
but this is the canonical template designers should follow.

---

## 1. LAYER STRUCTURE

Every `.ai` file processed by Templator Pro has **one layer** containing all content.

```
Document
└── Layer: [LayerName]                e.g. "06-1138"
    ├── Group: Remark                 Info panel — variable text fields
    ├── Group: PrintingLayer          All face markings + registration
    ├── Group: LOGO                   Branding/logo (not modified by script)
    ├── Group: <unnamed>              Barcode / QR section (not modified)
    └── Group: <unnamed>              Dieline frame + dimension lines (not modified)
```

The script creates a **new layer** (named after `LayerName` Excel column) for each job,
duplicates the original layer content into it, modifies the new layer, and leaves the
original layer untouched and hidden.

---

## 2. REMARK GROUP

Contains all variable text fields that change per order. Structure is **flexible** —
designers can add or remove text frames as needed. The scan discovers all named text frames.

```
Group: Remark
├── Group: Detail                     Primary order data
│   ├── TextFrame: [name]             Any named text frame = variable field
│   ├── TextFrame: [name]
│   └── ...
└── Group: <unnamed>                  Secondary order data + registration
    ├── TextFrame: YPoint             Registration Y coordinate
    ├── TextFrame: XPoint             Registration X coordinate
    ├── TextFrame: Type               Box type identifier — READ ONLY
    ├── TextFrame: [name]             Any other named text frame
    └── PathItem: <path>              Decorative lines — not modified
```

### Known text frame names (common across templates)
The app discovers these via scan. Names are case-sensitive.

| Name | Content type | Notes |
|------|-------------|-------|
| `POLayer` | PO number | e.g. "20253614(H2-2505-311-CT)" |
| `QTYLayer` | Quantity | e.g. "15 CTNS" |
| `DeliveryLayer` | Delivery date | e.g. "30/06/2025" |
| `SOLayer` | Sales order | e.g. "06-2025-01138" |
| `WOLayer` | Work order | e.g. "06-2025-02277" |
| `WorkerName` | Worker name | e.g. "LENG" |
| `ModelName` | Product model | e.g. "Iron Shaker" |
| `Customer` | Customer name | e.g. "HOME STYLER FURNITURE SDN.BHD" |
| `Dimension` | Dimension string | e.g. "ID 900 X 650 X 330 MM" |
| `Substance` | Board material | e.g. "T150/M/T150" |
| `MasterCard` | MC reference | e.g. "X-071" |
| `PORemark` | PO remark | e.g. "KL-HS-MW051525" |
| `PCS` | Pieces count | e.g. "2PCS" — controls optional remark visibility |
| `MonthLayer` | Month number | 1–12, triggers graphical month icon replacement |
| `Type` | Box type | "TOP OPEN" or "TOP & BOTTOM" — read only, never modify |
| `XPoint` | X registration | Numeric string, auto-calculated |
| `YPoint` | Y registration | Numeric string, auto-calculated |

### Text frames the script must NEVER modify
- Any text frame with an **empty name** (unnamed) — these are static design labels
- `Type` — box type identifier, read by script but never changed

---

## 3. PRINTING LAYER GROUP

Contains all face markings and registration marks. Structure is consistent across templates.

```
Group: PrintingLayer
├── PathItem: XYPoint2                Registration mark 2
├── PathItem: XYPoint                 Registration mark 1 — used for TIF rotation detection
├── Group: Left                       Left face markings
│   ├── Group: LeftRemark1            Marking block 1 (priority 1 — never drop)
│   ├── Group: LeftRemark2            Marking block 2
│   │   └── TextFrame: ModelName      Product name (appears in multiple faces)
│   ├── Group: LeftRemark3            Marking block 3
│   ├── Group: LeftRemark4            Marking block 4
│   │   ├── TextFrame: PORemark       PO remark text
│   │   └── Group: <unnamed>          Supporting graphic
│   └── Group: LeftRemark5            Marking block 5
│       └── TextFrame: PCS            Pieces count (shown only if PCS value present)
├── Group: Right                      (same sub-structure as Left)
├── Group: Top                        (same sub-structure as Left)
└── Group: Bottom                     (same sub-structure as Left)
    ├── Group: BottomRemark1
    ├── Group: BottomRemark2
    │   └── TextFrame: ModelName
    ├── Group: BottomRemark3
    ├── Group: BottomRemark4
    │   ├── TextFrame: PORemark
    │   └── Group: <unnamed>
    └── Group: BottomRemark5
        └── TextFrame: PCS
```

### Remark group naming convention
Pattern: `[Face][Remark][N]` where Face ∈ {Left, Right, Top, Bottom}, N = 1..5+

The number of remark groups per face is flexible — the scan discovers all of them.
The canonical template uses 5 per face but designers may add more.

### XYPoint usage
`XYPoint` is a small dot PathItem used to detect correct rotation for TIF export:
- Script checks which quadrant of the artboard `XYPoint` falls in
- Rotates the PrintingLayer until `XYPoint` is in the top-right quadrant
- Then exports the TIF

---

## 4. TIF EXPORT TARGET

The TIF export is taken from the `PrintingLayer` group, not the full artboard.

```
PrintingLayer → exported as: [LayerName].tif
PrintingLayer2 → exported as: [LayerName]_BB.tif  (if group exists — optional)
```

`PrintingLayer2` is present in templates that have two print variants (FF/BB — front-face/back-face). Its absence is handled gracefully — no error.

---

## 5. UNNAMED GROUPS (DO NOT MODIFY)

The two unnamed top-level groups are:

| Position in tree | Contents | Treatment |
|-----------------|----------|-----------|
| Second from bottom | Barcode / QR code section | Display in tree as gray, never modify |
| Bottom | Dieline frame + dimension annotation lines | Display in tree as gray, never modify |

These groups appear in the layer tree as `<unnamed>` with a "paths only" indicator.
The script must never write to them.

---

## 6. JSX TRAVERSAL CONTRACT

Because face groups are **nested inside PrintingLayer** (not at the document root),
all group lookups must use recursive search — never flat `.groupItems["name"]`.

```javascript
// CORRECT — recursive search from layer root
var leftGroup = findGroupByName(doc.layers[0], "Left");

// WRONG — flat lookup fails for nested groups
var leftGroup = doc.groupItems["Left"];  // undefined

// findGroupByName must be recursive:
function findGroupByName(container, targetName) {
  var items = container.groupItems;
  for (var i = 0; i < items.length; i++) {
    if (items[i].name === targetName) return items[i];
    var found = findGroupByName(items[i], targetName);
    if (found) return found;
  }
  return null;
}
```

---

## 7. BOX TYPE IDENTIFIERS

Read from the `Type` text frame in the Remark group.

| Value | Meaning | Face dimension formula |
|-------|---------|----------------------|
| `"TOP OPEN"` | Open tray with ear covers | totalW = H×2 + L; totalH = W + ear×2 + H×2 |
| `"TOP & BOTTOM"` | Symmetric top and bottom panels | totalW = H×2 + W; totalH = H×2 + L |

Where L = box length, W = box width, H = box height (all in mm).
Ear width = ceil(W/2 × 2) / 2 (rounded up to nearest 0.5mm).

---

## 8. COORDINATE SYSTEM

Adobe Illustrator uses **points** (pt) internally. All measurements in the app UI are in mm.

```
Conversion: 1 mm = 2.83465 pt
```

Artboard origin: top-left corner.
Y axis: increases downward (standard PDF/PostScript coordinate system).

When the scan returns group bounding boxes, they are already converted to mm:
```
x = (geometricBounds[0] - artboardLeft) / MM   // distance from artboard left edge
y = (artboardTop - geometricBounds[1]) / MM     // distance from artboard top edge
w = (geometricBounds[2] - geometricBounds[0]) / MM
h = (geometricBounds[1] - geometricBounds[3]) / MM
```
