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
