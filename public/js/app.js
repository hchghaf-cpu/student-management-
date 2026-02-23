/* ══════════════════════════════════════════════════════
   Student Management System – Frontend Logic
══════════════════════════════════════════════════════ */

const API = '/api/students';

/* ── State ─────────────────────────────────────────── */
const state = {
  page:   1,
  limit:  10,
  sort:   'id',
  order:  'ASC',
  search: '',
  course: '',
  status: '',
};

/* ── Utility ───────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent  = msg;
  el.className    = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 3500);
}

function gradeClass(g) {
  return g ? `grade-badge grade-${g}` : '';
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function confirm(message) {
  return new Promise(resolve => {
    document.getElementById('confirm-message').textContent = message;
    const overlay = document.getElementById('confirm-overlay');
    overlay.classList.remove('hidden');

    const ok     = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');

    function cleanup(result) {
      overlay.classList.add('hidden');
      ok.removeEventListener('click', yes);
      cancel.removeEventListener('click', no);
      resolve(result);
    }
    const yes = () => cleanup(true);
    const no  = () => cleanup(false);
    ok.addEventListener('click', yes);
    cancel.addEventListener('click', no);
  });
}

/* ── Navigation ────────────────────────────────────── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'students')  loadStudents();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});
document.getElementById('btn-add-from-list').addEventListener('click', () => showView('add'));

/* ── Dashboard ─────────────────────────────────────── */
async function loadDashboard() {
  try {
    const res   = await fetch('/api/students/stats');
    const stats = await res.json();

    document.getElementById('stat-total').textContent    = stats.total;
    document.getElementById('stat-active').textContent   = stats.active;
    document.getElementById('stat-inactive').textContent = stats.inactive;
    document.getElementById('stat-courses').textContent  = stats.courses.length;

    renderBarChart('course-chart', stats.courses, 'course');
    renderBarChart('grade-chart',  stats.grades,  'grade');
  } catch {
    showToast('Failed to load dashboard data', 'error');
  }
}

function renderBarChart(containerId, rows, labelKey) {
  const container = document.getElementById(containerId);
  if (!rows.length) { container.innerHTML = '<p style="color:var(--clr-muted);font-size:.85rem">No data available</p>'; return; }
  const max = Math.max(...rows.map(r => r.cnt));
  container.innerHTML = rows.map(r => `
    <div class="bar-row">
      <span class="bar-row__label" title="${escHtml(r[labelKey])}">${escHtml(r[labelKey] || '—')}</span>
      <div class="bar-row__track">
        <div class="bar-row__fill" style="width:${Math.round((r.cnt / max) * 100)}%"></div>
      </div>
      <span class="bar-row__count">${r.cnt}</span>
    </div>
  `).join('');
}

/* ── Load Students ─────────────────────────────────── */
async function loadStudents() {
  const params = new URLSearchParams({
    page:   state.page,
    limit:  state.limit,
    sort:   state.sort,
    order:  state.order,
    search: state.search,
    course: state.course,
    status: state.status,
  });

  const tbody = document.getElementById('students-tbody');
  tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="skeleton" style="height:16px;width:60%;margin:auto"></div></div></td></tr>`;

  try {
    const res  = await fetch(`${API}?${params}`);
    const data = await res.json();
    renderTable(data.data);
    renderPagination(data);
    populateCourseFilter(data.data);
  } catch {
    showToast('Failed to load students', 'error');
  }
}

function renderTable(students) {
  const tbody = document.getElementById('students-tbody');
  if (!students.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-state__icon">🎓</div>
          <div class="empty-state__text">No students found</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td>${s.id}</td>
      <td><strong>${escHtml(s.name)}</strong></td>
      <td>${escHtml(s.email)}</td>
      <td>${escHtml(s.phone || '—')}</td>
      <td>${escHtml(s.course)}</td>
      <td>${s.grade ? `<span class="${gradeClass(s.grade)}">${escHtml(s.grade)}</span>` : '—'}</td>
      <td><span class="badge badge--${s.status.toLowerCase()}">${escHtml(s.status)}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn--icon btn--sm" title="View" onclick="viewStudent(${s.id})">👁</button>
          <button class="btn btn--icon btn--sm" title="Edit" onclick="openEditModal(${s.id})">✏️</button>
          <button class="btn btn--icon btn--sm" title="Delete" onclick="deleteStudent(${s.id},'${escHtml(s.name).replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ── Course Filter Autocomplete ────────────────────── */
const courseSet = new Set();
async function populateCourseFilter() {
  const sel = document.getElementById('filter-course');
  const cur = sel.value;
  try {
    const res   = await fetch('/api/students/stats');
    const stats = await res.json();
    sel.innerHTML = '<option value="">All Courses</option>';
    stats.courses.forEach(c => {
      courseSet.add(c.course);
      const opt = document.createElement('option');
      opt.value = opt.textContent = c.course;
      if (c.course === cur) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch { /* ignore */ }
}

/* ── Pagination ────────────────────────────────────── */
function renderPagination({ total, page, limit, totalPages }) {
  const container = document.getElementById('pagination');
  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${total} record${total !== 1 ? 's' : ''}`;
  container.innerHTML = '';
  container.appendChild(info);

  if (totalPages <= 1) return;

  function pageBtn(label, pg, disabled = false) {
    const btn = document.createElement('button');
    btn.className = `page-btn${pg === page ? ' active' : ''}`;
    btn.textContent = label;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener('click', () => { state.page = pg; loadStudents(); });
    return btn;
  }

  container.appendChild(pageBtn('«', 1,          page === 1));
  container.appendChild(pageBtn('‹', page - 1,  page === 1));

  const delta = 2;
  const pages = [];
  for (let p = Math.max(1, page - delta); p <= Math.min(totalPages, page + delta); p++) pages.push(p);
  if (pages[0] > 2) { container.appendChild(pageBtn('1', 1)); const dots = document.createElement('span'); dots.textContent = '…'; container.appendChild(dots); }
  else if (pages[0] === 2) container.appendChild(pageBtn('1', 1));
  pages.forEach(p => container.appendChild(pageBtn(p, p)));
  if (pages[pages.length - 1] < totalPages - 1) { const dots = document.createElement('span'); dots.textContent = '…'; container.appendChild(dots); container.appendChild(pageBtn(totalPages, totalPages)); }
  else if (pages[pages.length - 1] === totalPages - 1) container.appendChild(pageBtn(totalPages, totalPages));

  container.appendChild(pageBtn('›', page + 1,  page === totalPages));
  container.appendChild(pageBtn('»', totalPages, page === totalPages));
}

/* ── Sorting ───────────────────────────────────────── */
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (state.sort === col) {
      state.order = state.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
      state.sort  = col;
      state.order = 'ASC';
    }
    state.page = 1;

    document.querySelectorAll('.sortable .sort-arrow').forEach(s => s.textContent = '');
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = state.order === 'ASC' ? ' ▲' : ' ▼';
    loadStudents();
  });
});

/* ── Filters ───────────────────────────────────────── */
let searchTimer;
document.getElementById('filter-search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = e.target.value.trim();
    state.page = 1;
    loadStudents();
  }, 350);
});

document.getElementById('filter-course').addEventListener('change', e => {
  state.course = e.target.value; state.page = 1; loadStudents();
});
document.getElementById('filter-status').addEventListener('change', e => {
  state.status = e.target.value; state.page = 1; loadStudents();
});
document.getElementById('filter-limit').addEventListener('change', e => {
  state.limit = parseInt(e.target.value); state.page = 1; loadStudents();
});

/* ── View Student (Read) ───────────────────────────── */
async function viewStudent(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    const s   = await res.json();
    alert(`
Student Details
──────────────────
ID:       ${s.id}
Name:     ${s.name}
Email:    ${s.email}
Phone:    ${s.phone || '—'}
Course:   ${s.course}
Grade:    ${s.grade || '—'}
DOB:      ${s.dob || '—'}
Status:   ${s.status}
Address:  ${s.address || '—'}
Created:  ${new Date(s.created_at).toLocaleString()}
    `.trim());
  } catch {
    showToast('Failed to load student details', 'error');
  }
}

/* ── Edit Modal ────────────────────────────────────── */
async function openEditModal(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    const s   = await res.json();

    document.getElementById('edit-id').value      = s.id;
    document.getElementById('edit-name').value    = s.name;
    document.getElementById('edit-email').value   = s.email;
    document.getElementById('edit-phone').value   = s.phone   || '';
    document.getElementById('edit-course').value  = s.course;
    document.getElementById('edit-grade').value   = s.grade   || '';
    document.getElementById('edit-dob').value     = s.dob     || '';
    document.getElementById('edit-status').value  = s.status;
    document.getElementById('edit-address').value = s.address || '';

    clearFormErrors('edit-form');
    document.getElementById('modal-overlay').classList.remove('hidden');
  } catch {
    showToast('Failed to load student', 'error');
  }
}

document.getElementById('modal-close').addEventListener('click',  closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ── Edit Form Submit ──────────────────────────────── */
document.getElementById('edit-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearFormErrors('edit-form');

  const id   = document.getElementById('edit-id').value;
  const body = collectFormData('edit');

  const res  = await fetch(`${API}/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.errors) setFieldErrors('edit', data.errors);
    else showToast(data.error || 'Update failed', 'error');
    return;
  }
  closeModal();
  showToast('Student updated successfully');
  loadStudents();
  loadDashboard();
});

/* ── Add Form Submit ───────────────────────────────── */
document.getElementById('add-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearFormErrors('add-form');

  const body = collectFormData('add');

  const res  = await fetch(API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.errors) setFieldErrors('add', data.errors);
    else showToast(data.error || 'Could not add student', 'error');
    return;
  }
  showToast('Student added successfully!');
  document.getElementById('add-form').reset();
  showView('students');
});

/* ── Delete ────────────────────────────────────────── */
async function deleteStudent(id, name) {
  const ok = await confirm(`Delete "${name}"? This action cannot be undone.`);
  if (!ok) return;

  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) { showToast('Failed to delete student', 'error'); return; }
  showToast('Student deleted');
  if (state.page > 1) state.page--;
  loadStudents();
  loadDashboard();
}

/* ── Form Helpers ──────────────────────────────────── */
function collectFormData(prefix) {
  return {
    name:    document.getElementById(`${prefix}-name`).value.trim(),
    email:   document.getElementById(`${prefix}-email`).value.trim(),
    phone:   document.getElementById(`${prefix}-phone`).value.trim(),
    course:  document.getElementById(`${prefix}-course`).value.trim(),
    grade:   document.getElementById(`${prefix}-grade`).value,
    dob:     document.getElementById(`${prefix}-dob`).value,
    status:  document.getElementById(`${prefix}-status`).value,
    address: document.getElementById(`${prefix}-address`).value.trim(),
  };
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function setFieldErrors(prefix, errors) {
  errors.forEach(msg => {
    const field = msg.toLowerCase().includes('name')   ? 'name'
                : msg.toLowerCase().includes('email')  ? 'email'
                : msg.toLowerCase().includes('course') ? 'course'
                : null;
    if (field) {
      const inp = document.getElementById(`${prefix}-${field}`);
      const err = document.querySelector(`#${prefix}-form [data-field="${field}"]`);
      if (inp) inp.classList.add('error');
      if (err) err.textContent = msg;
    }
  });
  showToast(errors[0], 'error');
}

/* ── Init ──────────────────────────────────────────── */
(async function init() {
  await populateCourseFilter();
  showView('dashboard');
})();
