const express = require('express');
const router  = express.Router();
const { queryAll, queryOne, run } = require('../database');

// ── Helpers ─────────────────────────────────────────────────────────────────
function validate(body) {
  const errors = [];
  if (!body.name  || body.name.trim()   === '') errors.push('Name is required');
  if (!body.email || body.email.trim()  === '') errors.push('Email is required');
  if (!body.course|| body.course.trim() === '') errors.push('Course is required');
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('Invalid email format');
  return errors;
}

// ── GET /api/students ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { search = '', course = '', status = '', page = 1, limit = 10, sort = 'id', order = 'ASC' } = req.query;

  const allowedSorts  = ['id', 'name', 'email', 'course', 'grade', 'status', 'created_at'];
  const allowedOrders = ['ASC', 'DESC'];
  const safeSort  = allowedSorts.includes(sort)              ? sort            : 'id';
  const safeOrder = allowedOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

  const conditions = [];
  const params     = [];

  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (course) { conditions.push('course = ?'); params.push(course); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total  = (queryOne(`SELECT COUNT(*) AS cnt FROM students ${where}`, params) || {}).cnt || 0;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const students = queryAll(
    `SELECT * FROM students ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    data:       students,
    total,
    page:       parseInt(page),
    limit:      parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

// ── GET /api/students/stats ──────────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  const total    = (queryOne('SELECT COUNT(*) AS cnt FROM students') || {}).cnt || 0;
  const active   = (queryOne("SELECT COUNT(*) AS cnt FROM students WHERE status='Active'") || {}).cnt || 0;
  const inactive = (queryOne("SELECT COUNT(*) AS cnt FROM students WHERE status='Inactive'") || {}).cnt || 0;
  const courses  = queryAll('SELECT course, COUNT(*) AS cnt FROM students GROUP BY course ORDER BY cnt DESC');
  const grades   = queryAll("SELECT grade, COUNT(*) AS cnt FROM students WHERE grade IS NOT NULL AND grade != '' GROUP BY grade ORDER BY grade");
  res.json({ total, active, inactive, courses, grades });
});

// ── GET /api/students/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const student = queryOne('SELECT * FROM students WHERE id = ?', [parseInt(req.params.id)]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// ── POST /api/students ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { name, email, phone = '', course, grade = '', dob = '', address = '', status = 'Active' } = req.body;

  try {
    const { lastInsertRowid } = run(
      `INSERT INTO students (name,email,phone,course,grade,dob,address,status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [name.trim(), email.trim(), phone.trim(), course.trim(), grade.trim(), dob, address.trim(), status]
    );
    const student = queryOne('SELECT * FROM students WHERE id = ?', [lastInsertRowid]);
    res.status(201).json({ message: 'Student created successfully', data: student });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    throw e;
  }
});

// ── PUT /api/students/:id ────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const id       = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM students WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { name, email, phone = '', course, grade = '', dob = '', address = '', status = 'Active' } = req.body;

  try {
    run(
      `UPDATE students SET name=?,email=?,phone=?,course=?,grade=?,dob=?,address=?,status=?
       WHERE id=?`,
      [name.trim(), email.trim(), phone.trim(), course.trim(), grade.trim(), dob, address.trim(), status, id]
    );
    const student = queryOne('SELECT * FROM students WHERE id = ?', [id]);
    res.json({ message: 'Student updated successfully', data: student });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    throw e;
  }
});

// ── DELETE /api/students/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const id       = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM students WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  run('DELETE FROM students WHERE id = ?', [id]);
  res.json({ message: 'Student deleted successfully' });
});

module.exports = router;
