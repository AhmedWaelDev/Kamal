function calcTotal(sellingPrice, quantity) {
  return sellingPrice * quantity;
}

function calcNet(commercialPrice, sellingPrice, quantity) {
  return calcTotal(sellingPrice, quantity) - commercialPrice * quantity;
}

function calcPaid(commercialPrice, quantity) {
  return commercialPrice * quantity;
}

function formatMoney(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  return String(rounded) + ' ج.م';
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

function formatDate(d) {
  return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

function autoSessionName(sessions, now) {
  const base = 'جرد يوم ' + formatDate(new Date(now));
  const names = {};
  sessions.forEach((s) => { names[s.name] = true; });
  if (!names[base]) {
    return base;
  }
  let i = 2;
  while (names[base + ' (' + i + ')']) {
    i++;
  }
  return base + ' (' + i + ')';
}

function createSession(sessions, now) {
  const t = now === undefined ? Date.now() : now;
  return { id: makeId(), name: autoSessionName(sessions, t), createdAt: t, items: [] };
}

function sessionTotals(session) {
  let paid = 0;
  let total = 0;
  let net = 0;
  session.items.forEach((it) => {
    paid += calcPaid(it.commercialPrice, it.quantity);
    total += calcTotal(it.sellingPrice, it.quantity);
    net += calcNet(it.commercialPrice, it.sellingPrice, it.quantity);
  });
  return { paid, total, net };
}

function arUnit(n, one, two, few, many) {
  if (n === 1) {
    return 'منذ ' + one;
  }
  if (n === 2) {
    return 'منذ ' + two;
  }
  if (n <= 10) {
    return 'منذ ' + n + ' ' + few;
  }
  return 'منذ ' + n + ' ' + many;
}

function timeAgo(ts, now) {
  const t = now === undefined ? Date.now() : now;
  const diff = Math.max(0, t - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return 'الآن';
  }
  if (minutes < 60) {
    return arUnit(minutes, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return arUnit(hours, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return arUnit(days, 'يوم', 'يومين', 'أيام', 'يوم');
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return arUnit(weeks, 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوع');
  }
  return 'يوم ' + formatDate(new Date(ts));
}

const SESSIONS_KEY = 'inventory_sessions_v1';
const LEGACY_KEY = 'inventory_items_v1';

function loadSessions(storage) {
  const raw = storage.getItem(SESSIONS_KEY);
  if (raw === null || raw === undefined) {
    return [];
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new SyntaxError('stored sessions is not an array');
  }
  return parsed;
}

function saveSessions(storage, sessions) {
  storage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function migrateLegacy(storage, now) {
  const sessions = loadSessions(storage);
  const raw = storage.getItem(LEGACY_KEY);
  if (raw === null || raw === undefined) {
    return sessions;
  }
  const t = now === undefined ? Date.now() : now;
  let items = null;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    items = null;
  }
  if (Array.isArray(items) && items.length > 0) {
    sessions.unshift({ id: makeId(), name: 'جرد سابق', createdAt: t, items });
  } else if (!Array.isArray(items)) {
    storage.setItem(LEGACY_KEY + '_corrupt_' + t, raw);
  }
  storage.removeItem(LEGACY_KEY);
  saveSessions(storage, sessions);
  return sessions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet, calcPaid, validateItem, createItem, filterItems, loadItems, saveItems, STORAGE_KEY, formatMoney, formatDate, autoSessionName, createSession, sessionTotals, timeAgo, SESSIONS_KEY, LEGACY_KEY, loadSessions, saveSessions, migrateLegacy };
}
