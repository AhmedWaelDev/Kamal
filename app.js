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
