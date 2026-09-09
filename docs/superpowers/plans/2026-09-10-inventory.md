# Inventory App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Arabic RTL inventory website with add/edit/delete, live search, automatic total and net-profit math, persisted in browser localStorage.

**Architecture:** Static site with no build step and no backend. Pure logic lives in `logic.js` (globals in browser, `module.exports` in Node so it is testable). `app.js` wires the DOM to that logic. Storage key `inventory_items_v1`, write-through on every mutation.

**Tech Stack:** HTML5 (RTL), CSS3 (no framework), vanilla JavaScript, browser localStorage, Node 24 built-in test runner (`node --test`) for logic tests.

---

## File Structure

- Create: `logic.js` — pure functions only, zero DOM access: `calcTotal`, `calcNet`, `validateItem`, `filterItems`, `createItem`, `loadItems`, `saveItems`. Declared as top-level functions (browser globals) plus a conditional `module.exports` block for Node tests.
- Create: `tests/logic.test.js` — Node built-in `node:test` + `node:assert/strict` tests for every function in `logic.js`.
- Create: `index.html` — RTL shell: header, search input `#search-input`, form `#item-form` with `#field-name`, `#field-commercial`, `#field-selling`, `#field-qty`, `#field-paid`, `#submit-btn`, `#cancel-edit-btn`, `#form-error`, table with `#items-tbody`, `#empty-state`, `#items-count`, footer warning. Loads `logic.js` then `app.js`.
- Create: `styles.css` — layout A (form card on top, wide table below), green/red net profit, responsive horizontal scroll.
- Create: `app.js` — DOM wiring only (no duplicated math): state, render with `textContent`, CRUD, live search, localStorage persistence with corrupt-data backup, edit mode toggle.
- Existing: `docs/superpowers/specs/2026-09-10-inventory-design.md` — spec, read-only, do not modify.

Each file has one responsibility: `logic.js` computes, `app.js` interacts, `index.html` structures, `styles.css` styles, tests verify logic.

---

### Task 1: Calculation logic with tests

**Files:**
- Create: `tests/logic.test.js`
- Create: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing test for calculations**

Create `tests/logic.test.js` with exactly this content:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcTotal, calcNet } = require('../logic.js');

test('calcTotal multiplies selling price by quantity', () => {
  assert.equal(calcTotal(130, 10), 1300);
  assert.equal(calcTotal(40, 20), 800);
  assert.equal(calcTotal(0, 5), 0);
});

test('calcNet subtracts commercial cost from total', () => {
  assert.equal(calcNet(100, 130, 10), 300);
  assert.equal(calcNet(30, 40, 20), 200);
  assert.equal(calcNet(50, 40, 2), -20);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/logic.test.js`
Expected: FAIL with `Cannot find module '../logic.js'` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `logic.js` with exactly this content:

```js
function calcTotal(sellingPrice, quantity) {
  return sellingPrice * quantity;
}

function calcNet(commercialPrice, sellingPrice, quantity) {
  return calcTotal(sellingPrice, quantity) - commercialPrice * quantity;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/logic.test.js`
Expected: PASS, 2 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add inventory total and net-profit calculations"
```

---

### Task 2: Validation, item factory, and search filter with tests

**Files:**
- Modify: `tests/logic.test.js`
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests for validation, factory, and filter**

Replace `tests/logic.test.js` with exactly this content (keeps Task 1 tests, adds new ones):

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcTotal, calcNet, validateItem, createItem, filterItems } = require('../logic.js');

test('calcTotal multiplies selling price by quantity', () => {
  assert.equal(calcTotal(130, 10), 1300);
  assert.equal(calcTotal(40, 20), 800);
  assert.equal(calcTotal(0, 5), 0);
});

test('calcNet subtracts commercial cost from total', () => {
  assert.equal(calcNet(100, 130, 10), 300);
  assert.equal(calcNet(30, 40, 20), 200);
  assert.equal(calcNet(50, 40, 2), -20);
});

test('validateItem accepts a valid item', () => {
  const r = validateItem({ name: 'شاي', commercialPrice: 100, sellingPrice: 130, quantity: 10, paidAmount: 500 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
});

test('validateItem rejects empty name, negatives, and non-integer qty', () => {
  const r1 = validateItem({ name: '   ', commercialPrice: 1, sellingPrice: 1, quantity: 1, paidAmount: 0 });
  assert.equal(r1.ok, false);
  const r2 = validateItem({ name: 'x', commercialPrice: -1, sellingPrice: 1, quantity: 1, paidAmount: 0 });
  assert.equal(r2.ok, false);
  const r3 = validateItem({ name: 'x', commercialPrice: 1, sellingPrice: 1, quantity: 1.5, paidAmount: 0 });
  assert.equal(r3.ok, false);
  const r4 = validateItem({ name: 'x', commercialPrice: 1, sellingPrice: NaN, quantity: 1, paidAmount: 0 });
  assert.equal(r4.ok, false);
});

test('createItem trims name and assigns id and createdAt', () => {
  const item = createItem({ name: '  سكر  ', commercialPrice: 30, sellingPrice: 40, quantity: 20, paidAmount: 0 });
  assert.equal(item.name, 'سكر');
  assert.equal(typeof item.id, 'string');
  assert.ok(item.id.length > 0);
  assert.equal(typeof item.createdAt, 'number');
  assert.equal(item.quantity, 20);
});

test('filterItems matches by name substring, empty query returns all', () => {
  const items = [{ name: 'شاي العروسة' }, { name: 'سكر 1ك' }];
  assert.equal(filterItems(items, '').length, 2);
  assert.equal(filterItems(items, 'شاي').length, 1);
  assert.equal(filterItems(items, 'سكر').length, 1);
  assert.equal(filterItems(items, 'لا يوجد').length, 0);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test tests/logic.test.js`
Expected: FAIL with `validateItem is not a function` (Task 1 `logic.js` has no such export yet). The 2 calc tests pass, the 4 new tests fail at import destructure.

- [ ] **Step 3: Extend implementation, keep Task 1 functions byte-identical**

Replace `logic.js` with exactly this content:

```js
function calcTotal(sellingPrice, quantity) {
  return sellingPrice * quantity;
}

function calcNet(commercialPrice, sellingPrice, quantity) {
  return calcTotal(sellingPrice, quantity) - commercialPrice * quantity;
}

function isNonNegativeNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function validateItem(input) {
  const errors = [];
  if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push('اسم الصنف مطلوب');
  }
  if (!isNonNegativeNumber(input.commercialPrice)) {
    errors.push('السعر التجاري يجب أن يكون رقماً >= 0');
  }
  if (!isNonNegativeNumber(input.sellingPrice)) {
    errors.push('سعر البيع يجب أن يكون رقماً >= 0');
  }
  if (!isNonNegativeNumber(input.quantity) || !Number.isInteger(input.quantity)) {
    errors.push('الكمية يجب أن تكون عدداً صحيحاً >= 0');
  }
  if (!isNonNegativeNumber(input.paidAmount)) {
    errors.push('السعر المدفوع يجب أن يكون رقماً >= 0');
  }
  return { ok: errors.length === 0, errors };
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
}

function createItem(input) {
  return {
    id: makeId(),
    name: input.name.trim(),
    commercialPrice: input.commercialPrice,
    sellingPrice: input.sellingPrice,
    quantity: input.quantity,
    paidAmount: input.paidAmount,
    createdAt: Date.now()
  };
}

function filterItems(items, query) {
  const q = (query || '').trim().toLowerCase();
  if (q === '') {
    return items.slice();
  }
  return items.filter((it) => it.name.toLowerCase().includes(q));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet, validateItem, createItem, filterItems };
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test tests/logic.test.js`
Expected: PASS, 6 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add item validation, factory, and search filter"
```

---

### Task 3: Storage helpers with tests (injectable storage, no DOM)

**Files:**
- Modify: `tests/logic.test.js`
- Modify: `logic.js`
- Test: `tests/logic.test.js`

- [ ] **Step 1: Write the failing tests for storage helpers**

Append exactly this block to the end of `tests/logic.test.js` (keep all 6 existing tests above it):

```js
test('saveItems then loadItems round-trips', () => {
  const { saveItems, loadItems } = require('../logic.js');
  const mem = {};
  const fakeStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); }
  };
  const items = [{ id: 'a', name: 'شاي', commercialPrice: 1, sellingPrice: 2, quantity: 3, paidAmount: 0, createdAt: 1 }];
  saveItems(fakeStorage, items);
  assert.deepEqual(loadItems(fakeStorage), items);
});

test('loadItems returns [] when key is missing', () => {
  const { loadItems } = require('../logic.js');
  const fakeStorage = { getItem: () => null, setItem: () => {} };
  assert.deepEqual(loadItems(fakeStorage), []);
});

test('loadItems throws SyntaxError on corrupt JSON', () => {
  const { loadItems } = require('../logic.js');
  const fakeStorage = { getItem: () => '{oops', setItem: () => {} };
  assert.throws(() => loadItems(fakeStorage), SyntaxError);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test tests/logic.test.js`
Expected: FAIL with `saveItems is not a function` / `loadItems is not a function`.

- [ ] **Step 3: Add storage helpers to implementation**

In `logic.js`, insert exactly this block before the `if (typeof module ...)` line:

```js
const STORAGE_KEY = 'inventory_items_v1';

function loadItems(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null || raw === undefined) {
    return [];
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new SyntaxError('stored inventory is not an array');
  }
  return parsed;
}

function saveItems(storage, items) {
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
}
```

And replace the exports line with exactly this:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet, validateItem, createItem, filterItems, loadItems, saveItems, STORAGE_KEY };
}
```

The full `logic.js` must now contain all 9 top-level names: `calcTotal`, `calcNet`, `isNonNegativeNumber`, `validateItem`, `makeId`, `createItem`, `filterItems`, `STORAGE_KEY`, `loadItems`, `saveItems` (10 including the const). Do not rename anything from Tasks 1–2.

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test tests/logic.test.js`
Expected: PASS, 9 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add localStorage helpers with corrupt-data detection"
```

---

### Task 4: Page structure (index.html, Layout A)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create the page with all required IDs**

Create `index.html` with exactly this content:

```html
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>برنامج الجرد</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="container">
    <h1>برنامج الجرد</h1>

    <section class="card">
      <div class="search-row">
        <input id="search-input" type="search" placeholder="بحث باسم الصنف..." autocomplete="off">
        <span id="items-count"></span>
      </div>
      <form id="item-form">
        <div class="form-grid">
          <label>اسم الصنف<input id="field-name" type="text" required></label>
          <label>السعر التجاري<input id="field-commercial" type="number" min="0" step="any" value="0"></label>
          <label>سعر البيع<input id="field-selling" type="number" min="0" step="any" value="0"></label>
          <label>الكمية<input id="field-qty" type="number" min="0" step="1" value="0"></label>
          <label>السعر المدفوع<input id="field-paid" type="number" min="0" step="any" value="0"></label>
        </div>
        <p id="form-error" class="error" hidden></p>
        <div class="form-actions">
          <button id="submit-btn" type="submit">إضافة</button>
          <button id="cancel-edit-btn" type="button" hidden>إلغاء التعديل</button>
        </div>
      </form>
    </section>

    <section class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الصنف</th>
              <th>السعر التجاري</th>
              <th>سعر البيع</th>
              <th>الكمية</th>
              <th>السعر المدفوع</th>
              <th>سعر البيع الاجمالي</th>
              <th>صافي المكسب</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="items-tbody"></tbody>
        </table>
        <p id="empty-state" class="muted">لا توجد أصناف بعد. أضف أول صنف من الفورم فوق.</p>
      </div>
    </section>

    <footer class="muted">البيانات محفوظة في المتصفح فقط على هذا الجهاز.</footer>
  </main>
  <script src="logic.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify every required ID exists**

Run: `node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');for(const id of ['search-input','item-form','field-name','field-commercial','field-selling','field-qty','field-paid','submit-btn','cancel-edit-btn','form-error','items-tbody','empty-state','items-count']){if(!h.includes('id=\"'+id+'\"')){console.error('missing '+id);process.exit(1)}}console.log('all ids present')"`
Expected: `all ids present`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add inventory page structure (layout A, RTL)"
```

---

### Task 5: Styling (styles.css)

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Create the stylesheet**

Create `styles.css` with exactly this content:

```css
* { box-sizing: border-box; }
body { font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif; margin: 0; background: #f3f4f6; color: #111827; }
.container { max-width: 1000px; margin: 0 auto; padding: 16px; }
h1 { font-size: 24px; margin: 8px 0 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.search-row { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
#search-input { flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; }
#items-count { font-size: 13px; color: #6b7280; white-space: nowrap; }
.form-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.form-grid label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.form-grid input { padding: 9px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
.form-actions { display: flex; gap: 8px; margin-top: 12px; }
button { padding: 10px 18px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; font-size: 15px; cursor: pointer; }
button:hover { background: #1d4ed8; }
#cancel-edit-btn { background: #6b7280; }
.error { color: #b91c1c; font-size: 14px; }
.muted { color: #6b7280; font-size: 13px; }
.table-card { padding: 0; overflow: hidden; }
.table-wrap { overflow-x: auto; padding: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 760px; }
th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; }
thead th { background: #f9fafb; font-weight: 700; }
.positive { color: #15803d; font-weight: 700; }
.negative { color: #b91c1c; font-weight: 700; }
.row-actions { display: flex; gap: 6px; }
.row-actions button { padding: 6px 10px; font-size: 13px; }
.btn-edit { background: #0d9488; }
.btn-delete { background: #dc2626; }
@media (max-width: 800px) { .form-grid { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 2: Verify responsive rule and profit classes exist**

Run: `node -e "const fs=require('fs');const c=fs.readFileSync('styles.css','utf8');for(const s of ['.positive','.negative','@media','.table-wrap']){if(!c.includes(s)){console.error('missing '+s);process.exit(1)}}console.log('css ok')"`
Expected: `css ok`.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: style inventory layout A with RTL table"
```

---

### Task 6: App wiring (app.js — render, CRUD, search, persistence)

**Files:**
- Create: `app.js`
- Test: `tests/logic.test.js` (regression, no new tests)

- [ ] **Step 1: Create app.js**

Create `app.js` with exactly this content (uses only the `logic.js` globals, no duplicated math, XSS-safe via `textContent`):

```js
(function () {
  'use strict';

  const tbody = document.getElementById('items-tbody');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('items-count');
  const form = document.getElementById('item-form');
  const searchInput = document.getElementById('search-input');
  const nameEl = document.getElementById('field-name');
  const commercialEl = document.getElementById('field-commercial');
  const sellingEl = document.getElementById('field-selling');
  const qtyEl = document.getElementById('field-qty');
  const paidEl = document.getElementById('field-paid');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const errorEl = document.getElementById('form-error');

  let items = [];
  let editingId = null;
  let query = '';

  function fmt(n) {
    return Number(n).toFixed(2) + ' ج.م';
  }

  function persist() {
    try {
      saveItems(window.localStorage, items);
    } catch (e) {
      showError('تعذر الحفظ في المتصفح: ' + e.message);
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function readForm() {
    return {
      name: nameEl.value,
      commercialPrice: Number(commercialEl.value),
      sellingPrice: Number(sellingEl.value),
      quantity: Number(qtyEl.value),
      paidAmount: Number(paidEl.value)
    };
  }

  function fillForm(item) {
    nameEl.value = item.name;
    commercialEl.value = String(item.commercialPrice);
    sellingEl.value = String(item.sellingPrice);
    qtyEl.value = String(item.quantity);
    paidEl.value = String(item.paidAmount);
  }

  function clearForm() {
    form.reset();
    commercialEl.value = '0';
    sellingEl.value = '0';
    qtyEl.value = '0';
    paidEl.value = '0';
  }

  function setEditing(id) {
    editingId = id;
    submitBtn.textContent = id ? 'حفظ التعديل' : 'إضافة';
    cancelBtn.hidden = !id;
  }

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  function render() {
    const visible = filterItems(items, query);
    tbody.innerHTML = '';
    visible.forEach((item) => {
      const total = calcTotal(item.sellingPrice, item.quantity);
      const net = calcNet(item.commercialPrice, item.sellingPrice, item.quantity);
      const tr = document.createElement('tr');
      tr.appendChild(cell(item.name));
      tr.appendChild(cell(fmt(item.commercialPrice)));
      tr.appendChild(cell(fmt(item.sellingPrice)));
      tr.appendChild(cell(String(item.quantity)));
      tr.appendChild(cell(fmt(item.paidAmount)));
      tr.appendChild(cell(fmt(total)));
      const netTd = cell(fmt(net));
      netTd.className = net < 0 ? 'negative' : 'positive';
      tr.appendChild(netTd);
      const actionsTd = document.createElement('td');
      const wrap = document.createElement('div');
      wrap.className = 'row-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit';
      editBtn.textContent = 'تعديل';
      editBtn.addEventListener('click', () => {
        clearError();
        fillForm(item);
        setEditing(item.id);
        nameEl.focus();
      });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'حذف';
      delBtn.addEventListener('click', () => {
        if (!window.confirm('حذف "' + item.name + '"؟')) {
          return;
        }
        items = items.filter((it) => it.id !== item.id);
        if (editingId === item.id) {
          setEditing(null);
          clearForm();
        }
        persist();
        render();
      });
      wrap.appendChild(editBtn);
      wrap.appendChild(delBtn);
      actionsTd.appendChild(wrap);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
    emptyState.style.display = visible.length === 0 ? 'block' : 'none';
    countEl.textContent = 'عدد الأصناف: ' + visible.length + ' / ' + items.length;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
    const input = readForm();
    const check = validateItem({ name: input.name, commercialPrice: input.commercialPrice, sellingPrice: input.sellingPrice, quantity: input.quantity, paidAmount: input.paidAmount });
    if (!check.ok) {
      showError(check.errors[0]);
      return;
    }
    if (editingId) {
      items = items.map((it) => (it.id === editingId
        ? { id: it.id, name: input.name.trim(), commercialPrice: input.commercialPrice, sellingPrice: input.sellingPrice, quantity: input.quantity, paidAmount: input.paidAmount, createdAt: it.createdAt }
        : it));
      setEditing(null);
    } else {
      items.push(createItem({ name: input.name, commercialPrice: input.commercialPrice, sellingPrice: input.sellingPrice, quantity: input.quantity, paidAmount: input.paidAmount }));
    }
    clearForm();
    persist();
    render();
    nameEl.focus();
  });

  cancelBtn.addEventListener('click', () => {
    setEditing(null);
    clearForm();
    clearError();
  });

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    render();
  });

  function boot() {
    try {
      items = loadItems(window.localStorage);
    } catch (e) {
      try {
        window.localStorage.setItem(STORAGE_KEY + '_corrupt_' + Date.now(), window.localStorage.getItem(STORAGE_KEY));
      } catch (backupErr) {
        /* ignore backup failure, still reset */
      }
      items = [];
      showError('كانت البيانات المحفوظة تالفة وتمت إعادة الضبط (تم الاحتفاظ بنسخة احتياطية).');
    }
    render();
  }

  boot();
})();
```

- [ ] **Step 2: Run regression tests (logic untouched)**

Run: `node --test tests/`
Expected: PASS, 9 passing, 0 failing.

- [ ] **Step 3: Verify app.js uses shared logic and safe rendering**

Run: `node -e "const fs=require('fs');const a=fs.readFileSync('app.js','utf8');for(const s of ['calcTotal(','calcNet(','validateItem(','filterItems(','createItem(','loadItems(','saveItems(','textContent']){if(!a.includes(s)){console.error('missing '+s);process.exit(1)}}if(a.includes('innerHTML')&&!a.includes(\"tbody.innerHTML = ''\")){console.error('unsafe innerHTML');process.exit(1)}console.log('app wiring ok')"`
Expected: `app wiring ok`. (The single allowed `innerHTML` is only `tbody.innerHTML = ''` to clear rows; all item text goes through `textContent` via `cell()`.)

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire inventory CRUD, search, and persistence"
```

---

### Task 7: End-to-end browser verification

**Files:** none (verification only)

- [ ] **Step 1: Run full logic suite once more**

Run: `node --test tests/`
Expected: PASS, 9 passing, 0 failing.

- [ ] **Step 2: Serve and verify in a real browser**

Run: `npx --yes serve . -l 4173`
Expected: serving message with `http://localhost:4173`. Then open `http://localhost:4173/index.html` and work this checklist, checking each box only after seeing it:
  1. Page loads in Arabic, form on top, empty table with "لا توجد أصناف بعد".
  2. Add item (commercial 100, selling 130, qty 10, paid 500) → row shows total `1300.00 ج.م` and net `300.00 ج.م` in green.
  3. Add loss item (commercial 50, selling 40, qty 2) → net `-20.00 ج.م` in red.
  4. Search "شاي" filters to matching rows only; clearing search shows all.
  5. Edit a row → form fills, button reads "حفظ التعديل" → save updates row and recomputes.
  6. Delete a row → confirm dialog → row disappears.
  7. Reload page → items persist (localStorage).
  8. Invalid input (empty name, negative price, qty 1.5) → blocked with Arabic error, no row added.
  9. Narrow window to mobile width → table scrolls horizontally, form stacks to 2 columns.

- [ ] **Step 3: Final commit for any fixes found**

If the checklist found bugs, fix and re-run Step 1–2, then:

```bash
git add -A
git status --short
git commit -m "fix: address browser verification findings"
```

If no fixes were needed, skip this commit (do not create an empty commit).

---

### Task 8 (Amendment): Paid amount auto-computed from commercial price × quantity

**Rationale (user change request, supersedes Task 2/4/6 paid handling):** `paidAmount` is no longer typed by hand. It is computed as `commercialPrice * quantity`, shown in a readonly form field that live-updates while typing, and stored on the item at create/update time. Net profit is numerically unchanged (`total - paid`). Task 7 checklist paid expectations change accordingly (e.g. 100×10 → paid `1000.00 ج.م`).

**Files:**
- Modify: `tests/logic.test.js` (append 3 tests, keep existing 9)
- Modify: `logic.js` (add `calcPaid`, `validateItem` ignores `paidAmount`, `createItem` computes `paidAmount`, extend exports)
- Modify: `index.html` (paid input becomes readonly with `(تلقائي)` label)
- Modify: `app.js` (full replace: `readForm` computes paid via `calcPaid`, new `syncPaid()` + live listeners, `boot()` normalizes paid display)
- Test: `tests/logic.test.js`

- [ ] **Step 1: Append the new tests (keep existing 9)**

Append exactly this block to the end of `tests/logic.test.js`:

```js
test('calcPaid multiplies commercial price by quantity', () => {
  const { calcPaid } = require('../logic.js');
  assert.equal(calcPaid(100, 10), 1000);
  assert.equal(calcPaid(30, 20), 600);
  assert.equal(calcPaid(0, 5), 0);
});

test('validateItem ignores paidAmount (auto-computed, may be stale)', () => {
  const { validateItem } = require('../logic.js');
  const r = validateItem({ name: 'شاي', commercialPrice: 100, sellingPrice: 130, quantity: 10, paidAmount: -5 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
});

test('createItem computes paidAmount from commercial price and quantity', () => {
  const { createItem } = require('../logic.js');
  const item = createItem({ name: 'شاي', commercialPrice: 100, sellingPrice: 130, quantity: 10, paidAmount: 0 });
  assert.equal(item.paidAmount, 1000);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test tests/logic.test.js`
Expected: FAIL with `calcPaid is not a function` (existing 9 pass, 3 new fail at import destructure).

- [ ] **Step 3: Update `logic.js` with 4 exact edits**

Edit 1 — insert after the `calcNet` function block (after line `}` closing `calcNet`, before the blank line preceding `function isNonNegativeNumber`):

```js
function calcPaid(commercialPrice, quantity) {
  return commercialPrice * quantity;
}
```

Edit 2 — delete this block from `validateItem` (paid is system-computed, never user-validated):

```js
  if (!isNonNegativeNumber(input.paidAmount)) {
    errors.push('السعر المدفوع يجب أن يكون رقماً >= 0');
  }
```

Edit 3 — in `createItem`, replace the line `    paidAmount: input.paidAmount,` with exactly:

```js
    paidAmount: calcPaid(input.commercialPrice, input.quantity),
```

Edit 4 — replace the exports line with exactly:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet, calcPaid, validateItem, createItem, filterItems, loadItems, saveItems, STORAGE_KEY };
}
```

Do not touch anything else in `logic.js`. `isNonNegativeNumber` stays (still used by commercial/selling/quantity checks).

- [ ] **Step 4: Make the paid field readonly in `index.html`**

Replace exactly this line:

```html
          <label>السعر المدفوع<input id="field-paid" type="number" min="0" step="any" value="0"></label>
```

with exactly this line:

```html
          <label>السعر المدفوع (تلقائي)<input id="field-paid" type="number" min="0" step="any" value="0" readonly></label>
```

Nothing else in `index.html` changes (same id, same position, table headers untouched).

- [ ] **Step 5: Replace `app.js` with the paid-aware version**

Replace the full content of `app.js` with exactly this content (identical to Task 6 except: `readForm` computes paid via `calcPaid`, new `syncPaid()` with live listeners on commercial/qty inputs, `boot()` normalizes the paid display):

```js
(function () {
  'use strict';

  const tbody = document.getElementById('items-tbody');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('items-count');
  const form = document.getElementById('item-form');
  const searchInput = document.getElementById('search-input');
  const nameEl = document.getElementById('field-name');
  const commercialEl = document.getElementById('field-commercial');
  const sellingEl = document.getElementById('field-selling');
  const qtyEl = document.getElementById('field-qty');
  const paidEl = document.getElementById('field-paid');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const errorEl = document.getElementById('form-error');

  let items = [];
  let editingId = null;
  let query = '';

  function fmt(n) {
    return Number(n).toFixed(2) + ' ج.م';
  }

  function persist() {
    try {
      saveItems(window.localStorage, items);
    } catch (e) {
      showError('تعذر الحفظ في المتصفح: ' + e.message);
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function readForm() {
    const commercialPrice = Number(commercialEl.value);
    const quantity = Number(qtyEl.value);
    return {
      name: nameEl.value,
      commercialPrice,
      sellingPrice: Number(sellingEl.value),
      quantity,
      paidAmount: calcPaid(commercialPrice, quantity)
    };
  }

  function fillForm(item) {
    nameEl.value = item.name;
    commercialEl.value = String(item.commercialPrice);
    sellingEl.value = String(item.sellingPrice);
    qtyEl.value = String(item.quantity);
    paidEl.value = String(item.paidAmount);
  }

  function clearForm() {
    form.reset();
    commercialEl.value = '0';
    sellingEl.value = '0';
    qtyEl.value = '0';
    paidEl.value = '0';
  }

  function setEditing(id) {
    editingId = id;
    submitBtn.textContent = id ? 'حفظ التعديل' : 'إضافة';
    cancelBtn.hidden = !id;
  }

  function syncPaid() {
    const commercialPrice = Number(commercialEl.value) || 0;
    const quantity = Number(qtyEl.value) || 0;
    paidEl.value = String(calcPaid(commercialPrice, quantity));
  }

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  function render() {
    const visible = filterItems(items, query);
    tbody.innerHTML = '';
    visible.forEach((item) => {
      const total = calcTotal(item.sellingPrice, item.quantity);
      const net = calcNet(item.commercialPrice, item.sellingPrice, item.quantity);
      const tr = document.createElement('tr');
      tr.appendChild(cell(item.name));
      tr.appendChild(cell(fmt(item.commercialPrice)));
      tr.appendChild(cell(fmt(item.sellingPrice)));
      tr.appendChild(cell(String(item.quantity)));
      tr.appendChild(cell(fmt(item.paidAmount)));
      tr.appendChild(cell(fmt(total)));
      const netTd = cell(fmt(net));
      netTd.className = net < 0 ? 'negative' : 'positive';
      tr.appendChild(netTd);
      const actionsTd = document.createElement('td');
      const wrap = document.createElement('div');
      wrap.className = 'row-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit';
      editBtn.textContent = 'تعديل';
      editBtn.addEventListener('click', () => {
        clearError();
        fillForm(item);
        setEditing(item.id);
        nameEl.focus();
      });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'حذف';
      delBtn.addEventListener('click', () => {
        if (!window.confirm('حذف "' + item.name + '"؟')) {
          return;
        }
        items = items.filter((it) => it.id !== item.id);
        if (editingId === item.id) {
          setEditing(null);
          clearForm();
        }
        persist();
        render();
      });
      wrap.appendChild(editBtn);
      wrap.appendChild(delBtn);
      actionsTd.appendChild(wrap);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
    emptyState.style.display = visible.length === 0 ? 'block' : 'none';
    countEl.textContent = 'عدد الأصناف: ' + visible.length + ' / ' + items.length;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
    const input = readForm();
    const check = validateItem({ name: input.name, commercialPrice: input.commercialPrice, sellingPrice: input.sellingPrice, quantity: input.quantity, paidAmount: input.paidAmount });
    if (!check.ok) {
      showError(check.errors[0]);
      return;
    }
    if (editingId) {
      items = items.map((it) => (it.id === editingId
        ? { id: it.id, name: input.name.trim(), commercialPrice: input.commercialPrice, sellingPrice: input.sellingPrice, quantity: input.quantity, paidAmount: input.paidAmount, createdAt: it.createdAt }
        : it));
      setEditing(null);
    } else {
      items.push(createItem({ name: input.name, commercialPrice: input.commercialPrice, sellingPrice: input.sellingPrice, quantity: input.quantity, paidAmount: input.paidAmount }));
    }
    clearForm();
    persist();
    render();
    nameEl.focus();
  });

  cancelBtn.addEventListener('click', () => {
    setEditing(null);
    clearForm();
    clearError();
  });

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    render();
  });

  commercialEl.addEventListener('input', syncPaid);
  qtyEl.addEventListener('input', syncPaid);

  function boot() {
    try {
      items = loadItems(window.localStorage);
    } catch (e) {
      try {
        window.localStorage.setItem(STORAGE_KEY + '_corrupt_' + Date.now(), window.localStorage.getItem(STORAGE_KEY));
      } catch (backupErr) {
        /* ignore backup failure, still reset */
      }
      items = [];
      showError('كانت البيانات المحفوظة تالفة وتمت إعادة الضبط (تم الاحتفاظ بنسخة احتياطية).');
    }
    syncPaid();
    render();
  }

  boot();
})();
```

- [ ] **Step 6: Run tests — expect 12 passing**

Run: `node --test tests/logic.test.js`
Expected: PASS, 12 passing, 0 failing (existing 9 untouched and green, 3 new green).

- [ ] **Step 7: Verify wiring (adapt quoting for PowerShell if needed, same conditions)**

Check A — `app.js` contains each of `calcTotal(`, `calcNet(`, `calcPaid(`, `validateItem(`, `filterItems(`, `createItem(`, `loadItems(`, `saveItems(`, `syncPaid`, `textContent`, and the only `innerHTML` present is `tbody.innerHTML = ''`.
Check B — `index.html` contains `readonly` and `(تلقائي)` on the paid field, and still contains all 13 original IDs.
Expected: both checks pass.

- [ ] **Step 8: Commit all four files together**

```bash
git add logic.js tests/logic.test.js index.html app.js
git commit -m "feat: auto-compute paid amount from commercial price and quantity"
```

Use `git -c user.name="opencode" -c user.email="opencode@local"` flags if git identity is not configured. Stage ONLY those four files.

---

## Self-Review

**1. Spec coverage:** every spec section has a task. Goal/RTL/Layout A → Tasks 4–5. Data model + formulas (`total`, `net`, 2-decimal EGP, red/green) → Tasks 1, 6. Components (form, search, table, store) → Tasks 2–4, 6. Data flow (add/edit/delete/search/persist) → Task 6. Error handling (validation messages, corrupt-data backup, quota failure, clear-browser warning footer, `textContent` XSS rule) → Tasks 2, 3, 6. Testing checklist (math example 130×10, CRUD, search, reload, invalid, mobile) → Task 7.

**2. Placeholder scan:** no TBD/TODO, no "appropriate handling", no "similar to Task N" — every step shows exact file content and exact commands with expected output.

**3. Type consistency:** function names and signatures are identical across tasks: `calcTotal(sellingPrice, quantity)`, `calcNet(commercialPrice, sellingPrice, quantity)`, `validateItem(input) → {ok, errors}`, `createItem(input) → item`, `filterItems(items, query)`, `loadItems(storage)`, `saveItems(storage, items)`, `STORAGE_KEY = 'inventory_items_v1'`.

**4. Amendment (Task 8) self-check:** `calcPaid(commercialPrice, quantity)` follows the same pure-function shape; `validateItem` dropping the paid rule cannot break old tests (none assert on paid errors; the valid-item test passes extra `paidAmount` which is now ignored); `createItem` computing paid cannot break its old test (it never asserted `paidAmount`); `syncPaid` guards `NaN` via `|| 0`; submit path passes computed paid through both `validateItem` (always ok for paid) and `createItem`/update (recomputed identically); Task 7 paid expectations superseded (100×10 → paid 1000, total 1300, net 300). DOM IDs in `index.html` match `app.js` exactly (`search-input`, `item-form`, `field-name`, `field-commercial`, `field-selling`, `field-qty`, `field-paid`, `submit-btn`, `cancel-edit-btn`, `form-error`, `items-tbody`, `empty-state`, `items-count`).
