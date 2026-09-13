/**
 * JobReadyDash (SIH26135) — Participants page logic
 * ---------------------------------------------------
 * Full participant management: search, sort, filter, paginate,
 * add / view / edit / delete with validation + toasts.
 *
 * Backend (via window.api):
 *   GET    /api/participants
 *   POST   /api/participants
 *   PUT    /api/participants/{id}
 *   DELETE /api/participants/{id}   (path isolated in config.js)
 *
 * Role rules (UI only — backend enforces real authorization):
 *   ADMIN      : add / edit / delete
 *   DATA_ENTRY : add / edit (no delete)
 *   ANALYST    : read-only
 */

(function () {
  'use strict';

  const state = {
    all: [],
    filtered: [],
    page: 1,
    pageSize: 8,
    search: '',
    status: 'All',
    district: 'All',
    program: 'All',
    sortKey: 'name',
    sortDir: 1,
    editingId: null,
    deletingId: null
  };

  let participantModal = null;
  let viewModal = null;
  let deleteModal = null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth.initProtectedPage('participants')) return;
    participantModal = new bootstrap.Modal(document.getElementById('participantModal'));
    viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    state.pageSize = window.APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE || 8;

    // Deep-link search (?q=...) from dashboard topbar
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) {
      state.search = params.get('q');
      const input = document.getElementById('searchInput');
      if (input) input.value = state.search;
    }

    bindEvents();
    buildFilterOptions();
    loadParticipants();
  });

  /* ── Events ─────────────────────────────────────────────────── */
  function bindEvents() {
    const searchInput = document.getElementById('searchInput');
    let debounce = null;
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.search = e.target.value.trim();
          state.page = 1;
          applyAndRender();
        }, 250);
      });
    }

    ['statusFilter', 'districtFilter', 'programFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        state.status = document.getElementById('statusFilter').value;
        state.district = document.getElementById('districtFilter').value;
        state.program = document.getElementById('programFilter').value;
        state.page = 1;
        applyAndRender();
      });
    });

    const pageSize = document.getElementById('pageSizeSelect');
    if (pageSize) pageSize.addEventListener('change', () => {
      state.pageSize = parseInt(pageSize.value, 10);
      state.page = 1;
      applyAndRender();
    });

    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (state.sortKey === key) state.sortDir *= -1;
        else { state.sortKey = key; state.sortDir = 1; }
        updateSortIndicators();
        applyAndRender();
      });
    });

    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);

    const addBtn = document.getElementById('addParticipantBtn');
    if (addBtn) addBtn.addEventListener('click', () => openAddModal());
    const emptyAdd = document.getElementById('emptyAddBtn');
    if (emptyAdd) emptyAdd.addEventListener('click', () => openAddModal());

    const form = document.getElementById('participantForm');
    if (form) form.addEventListener('submit', handleSubmit);

    const confirmDelete = document.getElementById('confirmDeleteBtn');
    if (confirmDelete) confirmDelete.addEventListener('click', handleDelete);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);

    const retry = document.getElementById('participantsRetry');
    if (retry) retry.addEventListener('click', loadParticipants);

    // Table action delegation (view / edit / delete)
    const tbody = document.getElementById('participantsBody');
    if (tbody) {
      tbody.addEventListener('click', e => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'view') openViewModal(id);
        else if (action === 'edit') openEditModal(id);
        else if (action === 'delete') openDeleteModal(id);
      });
    }
  }

  function buildFilterOptions() {
    const districts = window.MockData.MOCK_DISTRICTS;
    const programs = window.MockData.MOCK_PROGRAMS;
    const statuses = window.APP_CONFIG.EMPLOYMENT_STATUSES;

    const fill = (id, items) => {
      const el = document.getElementById(id);
      if (!el) return;
      items.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = v;
        el.appendChild(opt);
      });
    };
    fill('statusFilter', statuses);
    fill('districtFilter', districts);
    fill('programFilter', programs);
    fill('fDistrict', districts);
    fill('fProgram', programs);
    fill('fStatus', statuses);
  }

  /* ── Load ───────────────────────────────────────────────────── */
  async function loadParticipants() {
    showTableState('loading');
    try {
      state.all = await window.api.getParticipants();
      document.getElementById('totalCount').textContent = state.all.length;
      applyAndRender();
    } catch (err) {
      console.error(err);
      showTableState('error', err.message);
      window.UI.toast(err.message || 'Failed to load participants.', 'error');
    }
  }

  /* ── Filter / sort / paginate ───────────────────────────────── */
  function applyFilters() {
    const q = state.search.toLowerCase();
    let rows = state.all.filter(p => {
      const matchQ = !q ||
        [p.id, p.name, p.email, p.phone, p.district, p.program, p.status]
          .some(v => String(v || '').toLowerCase().includes(q));
      const matchS = state.status === 'All' || p.status === state.status;
      const matchD = state.district === 'All' || p.district === state.district;
      const matchP = state.program === 'All' || p.program === state.program;
      return matchQ && matchS && matchD && matchP;
    });

    const key = state.sortKey;
    rows.sort((a, b) => {
      const av = String(a[key] || '').toLowerCase();
      const bv = String(b[key] || '').toLowerCase();
      if (av < bv) return -1 * state.sortDir;
      if (av > bv) return 1 * state.sortDir;
      return 0;
    });

    state.filtered = rows;
  }

  function applyAndRender() {
    applyFilters();
    renderTable();
    renderPagination();
    renderActiveFilters();
    updateSortIndicators();
  }

  function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
      const key = th.getAttribute('data-sort');
      const icon = th.querySelector('.sort-icon');
      if (!icon) return;
      if (key === state.sortKey) {
        icon.textContent = state.sortDir === 1 ? ' ↑' : ' ↓';
        th.classList.add('text-primary');
      } else {
        icon.textContent = '';
        th.classList.remove('text-primary');
      }
    });
  }

  function clearFilters() {
    state.search = ''; state.status = 'All'; state.district = 'All';
    state.program = 'All'; state.page = 1;
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'All';
    document.getElementById('districtFilter').value = 'All';
    document.getElementById('programFilter').value = 'All';
    applyAndRender();
  }

  function renderActiveFilters() {
    const wrap = document.getElementById('activeFilters');
    if (!wrap) return;
    const chips = [];
    if (state.search) chips.push('Search: "' + state.search + '"');
    if (state.status !== 'All') chips.push(state.status);
    if (state.district !== 'All') chips.push(state.district);
    if (state.program !== 'All') chips.push(state.program);
    wrap.innerHTML = chips.map(c =>
      '<span class="filter-chip"><i class="bi bi-funnel-fill"></i>' + window.UI.escapeHtml(c) + '</span>'
    ).join('');
    const count = document.getElementById('resultCount');
    if (count) {
      count.textContent = state.filtered.length + ' of ' + state.all.length + ' participants';
    }
  }

  /* ── Table render ───────────────────────────────────────────── */
  function statusBadge(status) {
    const meta = (window.MockData && window.MockData.STATUS_META[status]) || { badge: 'bg-secondary' };
    return '<span class="badge status-badge ' + meta.badge + '">' + window.UI.escapeHtml(status) + '</span>';
  }

  function showTableState(mode, message) {
    const tbody = document.getElementById('participantsBody');
    const emptyBox = document.getElementById('emptyState');
    const errorBox = document.getElementById('tableError');
    const tableWrap = document.getElementById('tableWrap');
    const pagination = document.getElementById('paginationBar');
    if (emptyBox) emptyBox.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';
    if (tableWrap) tableWrap.style.display = '';
    if (pagination) pagination.style.display = '';

    if (mode === 'loading') {
      tbody.innerHTML = Array.from({ length: 6 }).map(() =>
        '<tr>' + '<td><div class="skel-line skeleton">&nbsp;</div></td>'.repeat(8) + '</tr>'
      ).join('');
    } else if (mode === 'error') {
      if (tableWrap) tableWrap.style.display = 'none';
      if (pagination) pagination.style.display = 'none';
      if (errorBox) {
        errorBox.style.display = '';
        const msg = document.getElementById('tableErrorMsg');
        if (msg) msg.textContent = message || 'Something went wrong.';
      }
    }
  }

  function renderTable() {
    const tbody = document.getElementById('participantsBody');
    const emptyBox = document.getElementById('emptyState');
    const tableWrap = document.getElementById('tableWrap');
    const pagination = document.getElementById('paginationBar');
    const errorBox = document.getElementById('tableError');
    if (errorBox) errorBox.style.display = 'none';

    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = state.filtered.slice(start, start + state.pageSize);

    const hasAnyData = state.all.length > 0;
    const hasResults = pageRows.length > 0;

    if (!hasAnyData) {
      // True empty state (no participants at all)
      tableWrap.style.display = 'none';
      pagination.style.display = 'none';
      emptyBox.style.display = '';
      document.getElementById('emptyTitle').textContent = 'No participants yet';
      document.getElementById('emptyText').textContent =
        'Get started by adding your first participant. Records added here will appear in dashboards and analytics.';
      return;
    }
    if (!hasResults) {
      // No-results state (filters too narrow)
      tableWrap.style.display = 'none';
      pagination.style.display = 'none';
      emptyBox.style.display = '';
      document.getElementById('emptyTitle').textContent = 'No matching participants';
      document.getElementById('emptyText').textContent =
        'Try adjusting your search or clearing the active filters to see more results.';
      return;
    }

    emptyBox.style.display = 'none';
    tableWrap.style.display = '';
    pagination.style.display = '';

    const canManage = window.Auth.canManageParticipants();
    const canDelete = window.Auth.canDeleteParticipants();

    tbody.innerHTML = pageRows.map(p => {
      const initials = String(p.name || '?').trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
      return '<tr>' +
        '<td class="id-cell">' + window.UI.escapeHtml(p.id) + '</td>' +
        '<td><div class="d-flex align-items-center gap-2"><span class="table-avatar">' + window.UI.escapeHtml(initials) +
        '</span><div><strong>' + window.UI.escapeHtml(p.name) + '</strong></div></div></td>' +
        '<td class="text-muted">' + window.UI.escapeHtml(p.email) + '</td>' +
        '<td class="text-muted" style="white-space:nowrap">' + window.UI.escapeHtml(p.phone) + '</td>' +
        '<td>' + window.UI.escapeHtml(p.district) + '</td>' +
        '<td class="text-muted">' + window.UI.escapeHtml(p.program) + '</td>' +
        '<td>' + statusBadge(p.status) + '</td>' +
        '<td><div class="action-btns">' +
          '<button class="btn-icon" data-action="view" data-id="' + window.UI.escapeHtml(p.id) + '" title="View" aria-label="View ' + window.UI.escapeHtml(p.name) + '"><i class="bi bi-eye"></i></button>' +
          (canManage ? '<button class="btn-icon" data-action="edit" data-id="' + window.UI.escapeHtml(p.id) + '" title="Edit"><i class="bi bi-pencil"></i></button>' : '') +
          (canDelete ? '<button class="btn-icon danger" data-action="delete" data-id="' + window.UI.escapeHtml(p.id) + '" title="Delete"><i class="bi bi-trash"></i></button>' : '') +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    const start = state.filtered.length ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(state.filtered.length, state.page * state.pageSize);

    const info = document.getElementById('paginationInfo');
    if (info) info.textContent = 'Showing ' + start + '–' + end + ' of ' + state.filtered.length;

    const ul = document.getElementById('paginationList');
    if (!ul) return;
    const btn = (page, label, disabled, active) =>
      '<li class="page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '') + '">' +
      '<a class="page-link" href="#" data-page="' + page + '">' + label + '</a></li>';

    let html = btn(state.page - 1, '&laquo;', state.page === 1, false);
    const window_ = 2;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - state.page) <= window_) {
        html += btn(p, p, false, p === state.page);
      } else if (Math.abs(p - state.page) === window_ + 1) {
        html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
      }
    }
    html += btn(state.page + 1, '&raquo;', state.page === totalPages, false);
    ul.innerHTML = html;

    ul.querySelectorAll('a[data-page]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const p = parseInt(a.getAttribute('data-page'), 10);
        if (p >= 1 && p <= totalPages) {
          state.page = p;
          renderTable();
          renderPagination();
        }
      });
    });
  }

  /* ── Add / Edit modal ───────────────────────────────────────── */
  function openAddModal() {
    state.editingId = null;
    document.getElementById('participantModalTitle').textContent = 'Add Participant';
    document.getElementById('participantForm').reset();
    document.getElementById('participantForm').classList.remove('was-validated');
    clearFieldErrors();
    participantModal.show();
  }

  function openEditModal(id) {
    const p = state.all.find(x => String(x.id) === String(id));
    if (!p) return;
    state.editingId = id;
    document.getElementById('participantModalTitle').textContent = 'Edit Participant — ' + p.id;
    document.getElementById('fName').value = p.name || '';
    document.getElementById('fEmail').value = p.email || '';
    document.getElementById('fPhone').value = p.phone || '';
    document.getElementById('fDistrict').value = p.district || '';
    document.getElementById('fProgram').value = p.program || '';
    document.getElementById('fStatus').value = p.status || '';
    document.getElementById('participantForm').classList.remove('was-validated');
    clearFieldErrors();
    participantModal.show();
  }

  function clearFieldErrors() {
    document.querySelectorAll('#participantForm .is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  function validateForm() {
    let valid = true;
    const get = id => document.getElementById(id);
    const mark = (el, ok) => { el.classList.toggle('is-invalid', !ok); if (!ok) valid = false; };

    const name = get('fName');
    mark(name, name.value.trim().length >= 3);

    const email = get('fEmail');
    mark(email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()));

    const phone = get('fPhone');
    const digits = phone.value.replace(/\D/g, '');
    mark(phone, digits.length >= 10 && digits.length <= 13);

    mark(get('fDistrict'), !!get('fDistrict').value);
    mark(get('fProgram'), !!get('fProgram').value);
    mark(get('fStatus'), !!get('fStatus').value);

    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      window.UI.toast('Please fix the highlighted fields.', 'warning');
      return;
    }
    const payload = {
      name: document.getElementById('fName').value.trim(),
      email: document.getElementById('fEmail').value.trim(),
      phone: document.getElementById('fPhone').value.trim(),
      district: document.getElementById('fDistrict').value,
      program: document.getElementById('fProgram').value,
      status: document.getElementById('fStatus').value
    };

    const saveBtn = document.getElementById('saveParticipantBtn');
    const original = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border" role="status"></span> Saving…';

    try {
      if (state.editingId) {
        await window.api.updateParticipant(state.editingId, payload);
        window.UI.toast('Participant ' + state.editingId + ' updated successfully.', 'success');
      } else {
        const created = await window.api.createParticipant(payload);
        window.UI.toast('Participant ' + created.id + ' added successfully.', 'success');
      }
      participantModal.hide();
      await loadParticipants();
    } catch (err) {
      console.error(err);
      window.UI.toast(err.message || 'Failed to save participant.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = original;
    }
  }

  /* ── View modal ─────────────────────────────────────────────── */
  function openViewModal(id) {
    const p = state.all.find(x => String(x.id) === String(id));
    if (!p) return;
    const set = (key, val) => {
      document.getElementById('v' + key).textContent = val || '—';
    };
    set('Id', p.id); set('Name', p.name); set('Email', p.email); set('Phone', p.phone);
    set('District', p.district); set('Program', p.program);
    set('Enrolled', window.UI.formatDate(p.enrollmentDate));
    set('Employer', p.employer); set('Salary', p.salary);
    const badge = document.getElementById('vStatus');
    if (badge) badge.innerHTML = statusBadge(p.status);
    const editFromView = document.getElementById('editFromViewBtn');
    if (editFromView) {
      editFromView.style.display = window.Auth.canManageParticipants() ? '' : 'none';
      editFromView.onclick = () => { viewModal.hide(); openEditModal(p.id); };
    }
    viewModal.show();
  }

  /* ── Delete flow ────────────────────────────────────────────── */
  function openDeleteModal(id) {
    const p = state.all.find(x => String(x.id) === String(id));
    if (!p) return;
    state.deletingId = id;
    document.getElementById('deleteName').textContent = p.name + ' (' + p.id + ')';
    deleteModal.show();
  }

  async function handleDelete() {
    if (!state.deletingId) return;
    const btn = document.getElementById('confirmDeleteBtn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border" role="status"></span> Deleting…';
    try {
      await window.api.deleteParticipant(state.deletingId);
      window.UI.toast('Participant ' + state.deletingId + ' deleted.', 'success');
      deleteModal.hide();
      state.deletingId = null;
      await loadParticipants();
    } catch (err) {
      console.error(err);
      window.UI.toast(err.message || 'Failed to delete participant.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  /* ── CSV export ─────────────────────────────────────────────── */
  function exportCSV() {
    if (!state.filtered.length) {
      window.UI.toast('Nothing to export.', 'warning');
      return;
    }
    const header = ['ID', 'Name', 'Email', 'Phone', 'District', 'Program', 'Employment Status', 'Enrollment Date'];
    const lines = state.filtered.map(p =>
      [p.id, p.name, p.email, p.phone, p.district, p.program, p.status, p.enrollmentDate || '']
        .map(v => '"' + String(v || '').replace(/"/g, '""') + '"')
        .join(',')
    );
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jobreadydash-participants.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    window.UI.toast('Exported ' + state.filtered.length + ' records to CSV.', 'success');
  }
})();
