(function () {
  'use strict';

  const homeView = document.getElementById('home-view');
  const detailView = document.getElementById('detail-view');
  const newSessionBtn = document.getElementById('new-session-btn');
  const sessionsList = document.getElementById('sessions-list');
  const sessionsEmpty = document.getElementById('sessions-empty');
  const homeError = document.getElementById('home-error');
  const backBtn = document.getElementById('back-btn');
  const sessionTitle = document.getElementById('session-title');
  const totalPaidEl = document.getElementById('total-paid');
  const totalSellEl = document.getElementById('total-sell');
  const totalNetEl = document.getElementById('total-net');
  const footCount = document.getElementById('foot-count');
  const footPaid = document.getElementById('foot-paid');
  const footTotal = document.getElementById('foot-total');
  const footNet = document.getElementById('foot-net');
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

  let sessions = [];
  let activeSessionId = null;
  let items = [];
  let editingId = null;
  let query = '';

  function fmt(n) {
    return formatMoney(n);
  }

  function activeSession() {
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === activeSessionId) {
        return sessions[i];
      }
    }
    return null;
  }

  function showView(name) {
    const home = name === 'home';
    homeView.hidden = !home;
    detailView.hidden = home;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function showHomeError(msg) {
    homeError.textContent = msg;
    homeError.hidden = false;
  }

  function hideHomeError() {
    homeError.textContent = '';
    homeError.hidden = true;
  }

  function persistSessions() {
    saveSessions(window.localStorage, sessions);
  }

  function persist() {
    const s = activeSession();
    if (s) {
      s.items = items;
    }
    try {
      persistSessions();
    } catch (e) {
      showError('تعذر الحفظ في المتصفح: ' + e.message);
    }
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

  function itemCountText(n) {
    if (n === 0) {
      return 'لا أصناف';
    }
    if (n === 1) {
      return 'صنف واحد';
    }
    if (n === 2) {
      return 'صنفان';
    }
    if (n <= 10) {
      return n + ' أصناف';
    }
    return n + ' صنف';
  }

  function renderTotals() {
    const t = sessionTotals({ items });
    totalPaidEl.textContent = formatMoney(t.paid);
    totalSellEl.textContent = formatMoney(t.total);
    totalNetEl.textContent = formatMoney(t.net);
    totalNetEl.className = 'total-value ' + (t.net < 0 ? 'negative' : 'positive');
    footCount.textContent = String(items.length);
    footPaid.textContent = formatMoney(t.paid);
    footTotal.textContent = formatMoney(t.total);
    footNet.textContent = formatMoney(t.net);
    footNet.className = t.net < 0 ? 'negative' : 'positive';
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
    renderTotals();
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

  function renderHome() {
    showView('home');
    sessionsList.innerHTML = '';
    const sorted = sessions.slice().sort((a, b) => b.createdAt - a.createdAt);
    sorted.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'session-card';
      const info = document.createElement('div');
      info.className = 'session-info';
      info.setAttribute('role', 'button');
      info.tabIndex = 0;
      info.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSession(s.id);
        }
      });
      const name = document.createElement('span');
      name.className = 'session-name';
      name.textContent = s.name;
      const meta = document.createElement('span');
      meta.className = 'session-meta';
      meta.textContent = timeAgo(s.createdAt, Date.now()) + ' • ' + itemCountText(s.items.length);
      info.appendChild(name);
      info.appendChild(meta);
      info.addEventListener('click', () => {
        openSession(s.id);
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'session-delete';
      del.textContent = 'حذف';
      del.addEventListener('click', () => {
        if (!window.confirm('حذف "' + s.name + '"؟')) {
          return;
        }
        sessions = sessions.filter((x) => x.id !== s.id);
        try {
          persistSessions();
        } catch (err) {
          window.alert('تعذر الحفظ في المتصفح: ' + err.message);
          return;
        }
        renderHome();
      });
      card.appendChild(info);
      card.appendChild(del);
      sessionsList.appendChild(card);
    });
    sessionsEmpty.style.display = sorted.length === 0 ? 'block' : 'none';
  }

  function openSession(id) {
    activeSessionId = id;
    const s = activeSession();
    items = s ? s.items.slice() : [];
    editingId = null;
    query = '';
    searchInput.value = '';
    clearForm();
    clearError();
    hideHomeError();
    setEditing(null);
    sessionTitle.textContent = s ? s.name : '';
    showView('detail');
    render();
  }

  newSessionBtn.addEventListener('click', () => {
    hideHomeError();
    const s = createSession(sessions, Date.now());
    sessions.unshift(s);
    try {
      persistSessions();
    } catch (e) {
      sessions = sessions.filter((x) => x.id !== s.id);
      showHomeError('تعذر الحفظ في المتصفح: ' + e.message);
      return;
    }
    openSession(s.id);
  });

  backBtn.addEventListener('click', () => {
    renderHome();
  });

  function boot() {
    try {
      sessions = migrateLegacy(window.localStorage, Date.now());
    } catch (e) {
      try {
        window.localStorage.setItem(SESSIONS_KEY + '_corrupt_' + Date.now(), window.localStorage.getItem(SESSIONS_KEY));
      } catch (backupErr) {
        /* ignore backup failure, still reset */
      }
      sessions = [];
      renderHome();
      showHomeError('كانت البيانات المحفوظة تالفة وتمت إعادة الضبط (تم الاحتفاظ بنسخة احتياطية).');
      return;
    }
    renderHome();
  }

  boot();
})();
