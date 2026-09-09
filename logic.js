function calcTotal(sellingPrice, quantity) {
  return sellingPrice * quantity;
}

function calcNet(commercialPrice, sellingPrice, quantity) {
  return calcTotal(sellingPrice, quantity) - commercialPrice * quantity;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calcTotal, calcNet };
}
