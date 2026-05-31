const pool    = require('../config/db');
const gemini  = require('../services/gemini');

/* ─── POST /api/reviews ─── (patient: upsert review for a doctor) */
exports.upsertReview = async (req, res) => {
  const { doctor_id, rating, comment } = req.body;
  const patient_id = req.user.id;

  if (!doctor_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'doctor_id and rating (1-5) are required' });
  }

  // Verify patient has at least one appointment with this doctor
  const [check] = await pool.execute(
    `SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ? LIMIT 1`,
    [patient_id, doctor_id]
  );
  if (!check.length) {
    return res.status(403).json({ error: 'You can only review doctors you have visited' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert review
    const [existing] = await conn.execute(
      `SELECT id, rating FROM reviews WHERE patient_id = ? AND doctor_id = ?`,
      [patient_id, doctor_id]
    );

    if (existing.length) {
      const oldRating = existing[0].rating;
      // Update rating_sum delta on doctor
      const delta = Number(rating) - Number(oldRating);
      await conn.execute(
        `UPDATE doctors SET rating_sum = rating_sum + ? WHERE id = ?`, [delta, doctor_id]
      );
      await conn.execute(
        `UPDATE reviews SET rating = ?, comment = ? WHERE patient_id = ? AND doctor_id = ?`,
        [rating, comment || null, patient_id, doctor_id]
      );
    } else {
      // New review
      await conn.execute(
        `INSERT INTO reviews (doctor_id, patient_id, rating, comment) VALUES (?, ?, ?, ?)`,
        [doctor_id, patient_id, rating, comment || null]
      );
      await conn.execute(
        `UPDATE doctors SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?`,
        [rating, doctor_id]
      );
    }

    await conn.commit();
    return res.status(201).json({ message: 'Review saved successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Failed to save review' });
  } finally {
    conn.release();
  }
};

/* ─── GET /api/reviews/:doctorId ─── (public) */
exports.getDoctorReviews = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.rating, r.comment, r.updated_at, p.name AS patient_name
       FROM reviews r JOIN patients p ON r.patient_id = p.id
       WHERE r.doctor_id = ?
       ORDER BY r.updated_at DESC`,
      [req.params.doctorId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

/* ─── POST /api/ai/triage ─── (patient: AI chatbot) */
exports.triageSymptoms = async (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || !symptoms.trim()) {
    return res.status(400).json({ error: 'symptoms text is required' });
  }
  try {
    const result = await gemini.triageSymptoms(symptoms.trim());
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
};
