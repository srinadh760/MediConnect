const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/db');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

/* ─── POST /api/auth/signup ─── */
exports.signup = async (req, res) => {
  const { name, email, password, role, phone, dob } = req.body;

  if (!name || !email || !password || !['doctor', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'name, email, password, and valid role are required' });
  }

  const table = role === 'doctor' ? 'doctors' : 'patients';
  const hash  = await bcrypt.hash(password, 12);

  try {
    let result;
    if (role === 'doctor') {
      [result] = await pool.execute(
        `INSERT INTO doctors (name, email, password) VALUES (?, ?, ?)`,
        [name, email, hash]
      );
    } else {
      [result] = await pool.execute(
        `INSERT INTO patients (name, email, password, phone, dob) VALUES (?, ?, ?, ?, ?)`,
        [name, email, hash, phone || null, dob || null]
      );
    }
    const token = signToken(result.insertId, role);
    return res.status(201).json({ token, role, id: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Signup failed' });
  }
};

/* ─── POST /api/auth/login ─── */
exports.login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !['doctor', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'email, password, and valid role are required' });
  }

  const table = role === 'doctor' ? 'doctors' : 'patients';

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM ${table} WHERE email = ? LIMIT 1`, [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id, role);
    const { password: _, ...safeUser } = user;
    return res.json({ token, role, user: safeUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

/* ─── GET /api/auth/me ─── */
exports.me = async (req, res) => {
  const { id, role } = req.user;
  const table = role === 'doctor' ? 'doctors' : 'patients';
  try {
    const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = rows[0];
    return res.json({ ...safeUser, role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not fetch profile' });
  }
};
