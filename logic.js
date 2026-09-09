function calcTotal(sellingPrice, quantity) {
  return sellingPrice * quantity;
}

function calcNet(commercialPrice, sellingPrice, quantity) {
  return calcTotal(sellingPrice, quantity) - commercialPrice * quantity;
}

function calcPaid(commercialPrice, quantity) {
  return commercialPrice * quantity;
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
    paidAmount: calcPaid(input.commercialPrice, input.quantity),
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet, calcPaid, validateItem, createItem, filterItems, loadItems, saveItems, STORAGE_KEY };
}
