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
