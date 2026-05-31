const pool    = require('../config/db');
const bitmask = require('../services/bitmask');

/* ─── GET /api/doctors ─── */
/* Query params: tags (comma-separated), name */
exports.listDoctors = async (req, res) => {
  try {
    let query = `
      SELECT id, name, bio, specialization_tags, shift_mask, fee, languages,
             CASE WHEN rating_count = 0 THEN 0
                  ELSE ROUND(rating_sum / rating_count, 1) END AS avg_rating,
             rating_count
      FROM doctors
    `;
    const params = [];
    const conditions = [];

    if (req.query.name) {
      conditions.push(`name LIKE ?`);
      params.push(`%${req.query.name}%`);
    }
    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(t => t.trim().toLowerCase());
      // Search inside JSON array
      tags.forEach(tag => {
        conditions.push(`JSON_SEARCH(LOWER(JSON_UNQUOTE(specialization_tags)), 'one', ?) IS NOT NULL`);
        params.push(`%${tag}%`);
      });
    }
    if (req.query.language) {
      conditions.push(`JSON_SEARCH(LOWER(JSON_UNQUOTE(languages)), 'one', ?) IS NOT NULL`);
      params.push(`%${req.query.language.toLowerCase()}%`);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY avg_rating DESC';

    const [rows] = await pool.execute(query, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

/* ─── GET /api/doctors/:id ─── */
exports.getDoctor = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.id, d.name, d.bio, d.specialization_tags, d.shift_mask, d.fee, d.languages,
              CASE WHEN d.rating_count = 0 THEN 0
                   ELSE ROUND(d.rating_sum / d.rating_count, 1) END AS avg_rating,
              d.rating_count
       FROM doctors d WHERE d.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Doctor not found' });

    // Attach reviews
    const [reviews] = await pool.execute(
      `SELECT r.rating, r.comment, r.updated_at, p.name AS patient_name
       FROM reviews r JOIN patients p ON r.patient_id = p.id
       WHERE r.doctor_id = ? ORDER BY r.updated_at DESC LIMIT 20`,
      [req.params.id]
    );
    return res.json({ ...rows[0], reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch doctor' });
  }
};

/* ─── PATCH /api/doctors/profile ─── (doctor only) */
exports.updateProfile = async (req, res) => {
  const { name, bio, fee, specialization_tags, shift_mask, languages } = req.body;
  const doctorId = req.user.id;
  try {
    const fields = [];
    const params = [];
    if (name !== undefined)               { fields.push('name = ?');               params.push(name); }
    if (bio  !== undefined)               { fields.push('bio = ?');                params.push(bio); }
    if (fee  !== undefined)               { fields.push('fee = ?');                params.push(Number(fee)); }
    if (specialization_tags !== undefined){ fields.push('specialization_tags = ?');params.push(JSON.stringify(specialization_tags)); }
    if (languages !== undefined)          { fields.push('languages = ?');          params.push(JSON.stringify(languages)); }
    if (shift_mask !== undefined)         { fields.push('shift_mask = ?');         params.push(Number(shift_mask)); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(doctorId);
    await pool.execute(`UPDATE doctors SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.execute(
      `SELECT id, name, bio, specialization_tags, shift_mask, fee, languages FROM doctors WHERE id = ?`,
      [doctorId]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Update failed' });
  }
};
