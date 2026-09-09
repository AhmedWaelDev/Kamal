# Inventory App Design (Jard) — 2026-09-10

## Goal
Simple Arabic RTL website to track shop inventory: add/edit/delete items, live search, automatic totals and net profit, persisted in the browser.

## Decisions (from brainstorming)
- Type: static website, Arabic RTL, single user, same device/browser
- Layout: A — form on top, wide table below (user-approved via visual companion)
- Approach: Option 1 — single-file-ish static site, no build, no backend (user chose 1 over export/print and backend options)
- Features in scope: add, edit, delete, search. Out of scope for v1: totals footer row, export/import, print, auth, multi-device sync.
- Storage: `localStorage` only.
- Formulas (fully automatic, user-approved; amended: paid is auto-computed, not manual): `paid = commercialPrice * quantity` (auto, readonly in form, live-updating), `total = sellingPrice * quantity`, `net = total - paid` (equivalently `total - (commercialPrice * quantity)`).

## Architecture
- No build step, no server, no dependencies.
- Files:
  - `index.html` — RTL (`dir="rtl" lang="ar"`), header, search input, item form, table, empty state, footer note.
  - `styles.css` — clean readable styling, red/green net profit, responsive table scroll on mobile.
  - `app.js` — state, rendering, CRUD, search, persistence.
- Storage key: `inventory_items_v1` (JSON array). Each write replaces whole array immediately (write-through).
- Runs by opening `index.html` directly or any static host. Works offline after first load.

## Components
1. **ItemForm** — inputs: name (text, required), commercialPrice (number >= 0), sellingPrice (number >= 0), quantity (integer >= 0); paidAmount is a readonly auto field (`paid = commercialPrice * quantity`) that live-updates on commercial/quantity input. Buttons: Add / Save-edit / Cancel-edit. Shows inline validation errors.
2. **SearchBar** — text input, live filter on item name, Arabic case-insensitive, trim.
3. **ItemsTable** — columns: اسم الصنف, السعر التجاري, سعر البيع, الكمية, السعر المدفوع, سعر البيع الاجمالي (computed), صافي المكسب (computed), actions (تعديل/حذف). Negative net in red, positive in green. Row count + empty-state row when no matches.
4. **Store** — `load()`, `save(items)`, corrupt-data recovery (backup to `inventory_items_v1_corrupt_<timestamp>` then reset to `[]` with notice).

## Data Model
```js
Item = {
  id: string,          // crypto.randomUUID() or Date.now fallback
  name: string,        // required, trimmed, non-empty
  commercialPrice: number, // >= 0
  sellingPrice: number,    // >= 0
  quantity: number,        // integer >= 0
  paidAmount: number,      // auto-computed = commercialPrice * quantity, stored per item
  createdAt: number        // timestamp
}
// Computed at render (never stored):
// total = sellingPrice * quantity
// net   = total - (commercialPrice * quantity)  [= total - paid]
// paid is computed at create/update time via calcPaid and stored; validation ignores any caller-supplied paidAmount.
```
// Display: whole numbers when exact, up to 2 decimals otherwise (`250` not `250.00`; `15.5`, `10.25` kept), EGP suffix. Example: commercial 100, selling 130, qty 10 → paid 1000, total 1300, net 300.

## Layout & Responsive (amended)
- Form grid inputs must shrink: grid children `min-width: 0`, inputs `width: 100%` — no overflow outside the card on desktop, no page-level horizontal scroll on mobile.
- Breakpoints: 5 columns desktop → 2 columns ≤800px → 1 column ≤480px; full-width action buttons and stacked search row on phones; table keeps scrolling inside its card with tighter padding/font on small screens.
- Inputs use 16px font (prevents iOS auto-zoom on focus).

## Data Flow
1. Load: on start, read `localStorage`, parse, validate array, render.
2. Add: validate form → create item with id → unshift/append → save → re-render + clear form.
3. Edit: click تعديل → populate form, switch to edit mode → Save validates → update by id → save → re-render, or Cancel exits edit mode.
4. Delete: click حذف → `confirm()` → remove by id → save → re-render.
5. Search: input event → filter by normalized name substring → render filtered list (store keeps full list).
6. Every mutation persists synchronously before re-render.

## Error Handling / Edge Cases
- Empty name → block with message "اسم الصنف مطلوب".
- Negative / NaN numbers → block, must be >= 0; quantity must be integer.
- Corrupt JSON in localStorage → backup corrupt value, reset, show notice.
- localStorage unavailable/full (QuotaExceededError) → show error, keep in-memory state.
- Clear-browser-data warning in footer: "البيانات محفوظة في المتصفح فقط".
- XSS: render user text via `textContent`, never `innerHTML` for item fields.

## Testing (v1 manual checklist)
- Add valid item appears with correct total/net.
- Known math: 130×10=1300 total, net 300.
- Edit updates values and recomputes.
- Delete removes after confirm.
- Search filters correctly, empty query shows all, no-match shows empty state.
- Reload page persists data.
- Invalid inputs (empty name, negative, non-numeric) blocked.
- Narrow viewport: table scrolls horizontally, form stacks.
- No automated tests in v1 (YAGNI).

## Future (explicitly out of scope)
Totals footer, CSV/JSON export-import, print, backend sync, auth. Can be added without rewrite (store abstraction already isolates persistence).
