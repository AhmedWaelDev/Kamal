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

test('formatMoney drops trailing zeros (250 not 250.00)', () => {
  const { formatMoney } = require('../logic.js');
  assert.equal(formatMoney(250), '250 ج.م');
  assert.equal(formatMoney(1000), '1000 ج.م');
  assert.equal(formatMoney(-20), '-20 ج.م');
  assert.equal(formatMoney(15.5), '15.5 ج.م');
  assert.equal(formatMoney(10.25), '10.25 ج.م');
});

test('autoSessionName uses date and disambiguates', () => {
  const { autoSessionName } = require('../logic.js');
  const day = new Date(2026, 8, 8, 12, 0, 0).getTime();
  assert.equal(autoSessionName([], day), 'جرد يوم 8/9/2026');
  const one = [{ name: 'جرد يوم 8/9/2026' }];
  assert.equal(autoSessionName(one, day), 'جرد يوم 8/9/2026 (2)');
  const two = [{ name: 'جرد يوم 8/9/2026' }, { name: 'جرد يوم 8/9/2026 (2)' }];
  assert.equal(autoSessionName(two, day), 'جرد يوم 8/9/2026 (3)');
});

test('createSession builds an empty dated session', () => {
  const { createSession } = require('../logic.js');
  const day = new Date(2026, 8, 8, 12, 0, 0).getTime();
  const s = createSession([], day);
  assert.equal(s.name, 'جرد يوم 8/9/2026');
  assert.equal(typeof s.id, 'string');
  assert.equal(s.createdAt, day);
  assert.deepEqual(s.items, []);
});

test('sessionTotals sums paid, total and net', () => {
  const { sessionTotals } = require('../logic.js');
  const t = sessionTotals({ items: [
    { commercialPrice: 100, sellingPrice: 130, quantity: 10 },
    { commercialPrice: 50, sellingPrice: 40, quantity: 2 }
  ] });
  assert.equal(t.paid, 1100);
  assert.equal(t.total, 1380);
  assert.equal(t.net, 280);
});

test('timeAgo formats Arabic relative time', () => {
  const { timeAgo } = require('../logic.js');
  const now = new Date(2026, 8, 10, 12, 0, 0).getTime();
  const min = 60000, hour = 3600000, day = 86400000;
  assert.equal(timeAgo(now - 30 * 1000, now), 'الآن');
  assert.equal(timeAgo(now - 1 * min, now), 'منذ دقيقة');
  assert.equal(timeAgo(now - 2 * min, now), 'منذ دقيقتين');
  assert.equal(timeAgo(now - 5 * min, now), 'منذ 5 دقائق');
  assert.equal(timeAgo(now - 15 * min, now), 'منذ 15 دقيقة');
  assert.equal(timeAgo(now - 1 * hour, now), 'منذ ساعة');
  assert.equal(timeAgo(now - 2 * hour, now), 'منذ ساعتين');
  assert.equal(timeAgo(now - 5 * hour, now), 'منذ 5 ساعات');
  assert.equal(timeAgo(now - 1 * day, now), 'منذ يوم');
  assert.equal(timeAgo(now - 2 * day, now), 'منذ يومين');
  assert.equal(timeAgo(now - 4 * day, now), 'منذ 4 أيام');
  assert.equal(timeAgo(now - 10 * day, now), 'منذ أسبوع');
  assert.equal(timeAgo(now - 20 * day, now), 'منذ أسبوعين');
  assert.equal(timeAgo(now - 60 * day, now), 'يوم 12/7/2026');
});

test('sessions save/load round-trip and reject corrupt JSON', () => {
  const { saveSessions, loadSessions, SESSIONS_KEY } = require('../logic.js');
  assert.equal(SESSIONS_KEY, 'inventory_sessions_v1');
  const mem = {};
  const fake = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  assert.deepEqual(loadSessions(fake), []);
  const sessions = [{ id: 's1', name: 'جرد يوم 8/9/2026', createdAt: 1, items: [] }];
  saveSessions(fake, sessions);
  assert.deepEqual(loadSessions(fake), sessions);
  assert.throws(() => loadSessions({ getItem: () => '{oops', setItem: () => {}, removeItem: () => {} }), SyntaxError);
});

test('migrateLegacy moves old items once into جرد سابق', () => {
  const { migrateLegacy, LEGACY_KEY, SESSIONS_KEY } = require('../logic.js');
  function makeFake(seed) {
    const mem = Object.assign({}, seed);
    return {
      mem,
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    };
  }
  const day = new Date(2026, 8, 10, 12, 0, 0).getTime();
  const items = [{ id: 'a', name: 'شاي', commercialPrice: 1, sellingPrice: 2, quantity: 3, paidAmount: 3, createdAt: 1 }];
  const f1 = makeFake({ [LEGACY_KEY]: JSON.stringify(items) });
  const out = migrateLegacy(f1, day);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'جرد سابق');
  assert.deepEqual(out[0].items, items);
  assert.equal(f1.getItem(LEGACY_KEY), null);
  assert.deepEqual(JSON.parse(f1.getItem(SESSIONS_KEY)), out);
  const f2 = makeFake({});
  assert.deepEqual(migrateLegacy(f2, day), []);
  const f3 = makeFake({ [LEGACY_KEY]: JSON.stringify([]) });
  assert.deepEqual(migrateLegacy(f3, day), []);
  assert.equal(f3.getItem(LEGACY_KEY), null);
});
