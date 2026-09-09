# Inventory App Design (Jard) — 2026-09-10

## Goal
Simple Arabic RTL website to track shop inventory: a home screen with saved inventory sessions (new/open/delete, Arabic relative timestamps), and per-session pages to add/edit/delete items with live search, automatic per-item math plus session-wide totals (paid/selling/net) as summary cards and a table footer row, persisted in the browser.

## Decisions (from brainstorming)
- Type: static website, Arabic RTL, single user, same device/browser
- Layout: A — form on top, wide table below (user-approved via visual companion)
- Approach: Option 1 — single-file-ish static site, no build, no backend (user chose 1 over export/print and backend options)
- Features in scope: add, edit, delete, search. Out of scope for v1: totals footer row, export/import, print, auth, multi-device sync.
- Storage: `localStorage` only.
- Formulas (fully automatic, user-approved; amended: paid is auto-computed, not manual): `paid = commercialPrice * quantity` (auto, readonly in form, live-updating), `total = sellingPrice * quantity`, `net = total - paid` (equivalently `total - (commercialPrice * quantity)`).
- Sessions (Task 10, user-approved): home screen with [+ جرد جديد] button and saved-session cards (newest first), each showing auto name + Arabic relative time + item count; click opens (full editing), 🗑️ deletes with confirm. No rename (YAGNI).
- Session auto-naming: `جرد يوم D/M/YYYY` (e.g. `جرد يوم 8/9/2026`), suffixed ` (2)`, ` (3)`… when the name exists.
- Relative time (Arabic): `الآن` (<1 min), `منذ دقيقة/دقيقتين/N دقائق/N دقيقة`, `منذ ساعة/ساعتين/N ساعات/N ساعة`, `منذ يوم/يومين/N أيام/N يوم`, `منذ أسبوع/أسبوعين/N أسابيع/N أسبوع`, older → `يوم D/M/YYYY`.
- Session totals (user chose cards + footer row): 3 summary cards above the table (paid/selling/net, net green/red) plus a bold `الإجمالي` footer row (item count + the 3 sums). Totals = sums of per-item computed values, formatted with `formatMoney`.
- Legacy migration: existing `inventory_items_v1` items move once into a session named `جرد سابق` (created now); the legacy key is then removed. Empty/missing legacy → no session created. Corrupt (unparseable/non-array) legacy → quarantined to `inventory_items_v1_corrupt_<ts>`, existing sessions kept untouched.
- Failed session delete rolls back in-memory state and re-renders (no storage/memory divergence).

## Architecture
- No build step, no server, no dependencies.
- Files:
  - `index.html` — RTL (`dir="rtl" lang="ar"`), header, `#home-view` (new-session button, sessions list, empty state) + `#detail-view` (header row with ghost back button + session title, item form card, totals cards, standalone search card under the totals, table with `tfoot` totals row, empty state), footer note.
  - `styles.css` — clean readable styling, red/green net profit, responsive table scroll on mobile; session cards, totals cards, single-column phone layout.
  - `app.js` — home/detail view switching, session CRUD, item CRUD scoped to the open session, search, totals rendering, persistence.
  - `logic.js` — pure functions incl. session helpers (`autoSessionName`, `createSession`, `sessionTotals`, `timeAgo`), storage helpers, migration.
- Storage keys: `inventory_sessions_v1` (JSON array of sessions). Each write replaces whole array immediately (write-through). Legacy `inventory_items_v1` is migrated once (see above) then removed.
- Runs by opening `index.html` directly or any static host. Works offline after first load.

## Components
1. **ItemForm** — inputs: name (text, required), commercialPrice (number >= 0), sellingPrice (number >= 0), quantity (integer >= 0); paidAmount is a readonly auto field (`paid = commercialPrice * quantity`) that live-updates on commercial/quantity input. Buttons: Add / Save-edit / Cancel-edit. Shows inline validation errors.
2. **SearchBar** — text input, live filter on item name, Arabic case-insensitive, trim.
3. **ItemsTable** — columns: اسم الصنف, السعر التجاري, سعر البيع, الكمية, السعر المدفوع, سعر البيع الاجمالي (computed), صافي المكسب (computed), actions (تعديل/حذف). Negative net in red, positive in green. Row count + empty-state row when no matches. Bold `الإجمالي` footer row with item count + the 3 session sums.
4. **SessionList (home)** — [+ جرد جديد] button; session cards (name, `timeAgo • N أصناف`, delete with confirm); empty-state text; home error line for storage failures.
5. **TotalsCards (detail)** — 3 cards (المدفوع للكل / البيع الإجمالي للكل / الصافي للكل) refreshed on every render; net card green/red.
4. **Store** — `load()`, `save(items)`, corrupt-data recovery (backup to `inventory_items_v1_corrupt_<timestamp>` then reset to `[]` with notice).

## Data Model
```js
Session = {
  id: string,          // makeId()
  name: string,        // autoSessionName(), e.g. 'جرد يوم 8/9/2026'
  createdAt: number,   // timestamp
  items: Item[]        // same Item shape as before
}
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

## Detail header & search placement (amended, Task 14)
- Detail header is one row: ghost back button (`→ الرئيسية`, white bg, bordered) + session title sharing the row — no floating gray pill.
- Search lives in its own card between the totals cards and the table, i.e. right under الصافي للكل (order: form → totals → search → table).

## Layout & Responsive (amended)
- Form grid inputs must shrink: grid children `min-width: 0`, inputs `width: 100%` — no overflow outside the card on desktop, no page-level horizontal scroll on mobile.
- Breakpoints: 5 columns desktop → 2 columns ≤800px → 1 column ≤480px; full-width action buttons and stacked search row on phones; table keeps scrolling inside its card with tighter padding/font on small screens.
- Inputs use 16px font (prevents iOS auto-zoom on focus).

## Data Flow
1. Load: on start, `migrateLegacy()` (once) then `loadSessions()`, render home. Corrupt sessions JSON → backup + reset with notice on home.
2. New inventory: `createSession()` → unshift → save → open detail (empty form/table, zeroed totals).
3. Open session: copy its items into the detail editor; all item mutations save the whole sessions array (write-through); totals re-render every time.
4. Delete session: confirm → remove → save → re-render home.
5. Back: detail → home (no save needed; everything already persisted).
6. Item flows (scoped to the open session): add (validate → create with id → save → re-render + clear), edit (fill form → save/cancel), delete (confirm → remove), search (live filter), every mutation persists synchronously before re-render.

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
