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
