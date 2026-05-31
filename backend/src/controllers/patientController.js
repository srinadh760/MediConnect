const pool = require('../config/db');
const path = require('path');

/* ─── GET /api/patients/profile ─── */
exports.getProfile = async (req, res) => {
  const id = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, dob, wallet, created_at FROM patients WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/* ─── PATCH /api/patients/profile ─── */
exports.updateProfile = async (req, res) => {
  const { name, phone, dob } = req.body;
  const id = req.user.id;
  try {
    const fields = [];
    const params = [];
    if (name !== undefined)  { fields.push('name = ?');  params.push(name); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone || null); }
    if (dob !== undefined)   { fields.push('dob = ?');   params.push(dob || null); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    await pool.execute(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, dob, wallet FROM patients WHERE id = ?`, [id]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Update failed' });
  }
};

/* ─── POST /api/patients/records ─── (upload medical record) */
exports.uploadRecord = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const patient_id = req.user.id;
  const label      = req.body.label || '';
  const filename   = req.file.originalname;
  const filepath   = req.file.path;

  try {
    const [result] = await pool.execute(
      `INSERT INTO medical_records (patient_id, uploaded_by, filename, filepath, label)
       VALUES (?, 'patient', ?, ?, ?)`,
      [patient_id, filename, filepath, label]
    );
    return res.status(201).json({ id: result.insertId, filename, label });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Upload failed' });
  }
};

/* ─── GET /api/patients/records ─── (own records) */
exports.getRecords = async (req, res) => {
  const patient_id = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT mr.*, d.name AS doctor_name
       FROM medical_records mr
       LEFT JOIN doctors d ON mr.doctor_id = d.id
       WHERE mr.patient_id = ?
       ORDER BY mr.created_at DESC`,
      [patient_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch records' });
  }
};

/* ─── GET /api/patients/:patientId/records ─── (doctor views patient records after booking) */
exports.getDoctorViewRecords = async (req, res) => {
  const doctor_id  = req.user.id;
  const patient_id = req.params.patientId;

  // Verify at least one appointment exists between this doctor and patient
  const [check] = await pool.execute(
    `SELECT id FROM appointments WHERE doctor_id = ? AND patient_id = ? LIMIT 1`,
    [doctor_id, patient_id]
  );
  if (!check.length) {
    return res.status(403).json({ error: 'No appointment with this patient' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT mr.*, d.name AS doctor_name
       FROM medical_records mr
       LEFT JOIN doctors d ON mr.doctor_id = d.id
       WHERE mr.patient_id = ?
       ORDER BY mr.created_at DESC`,
      [patient_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch records' });
  }
};

/* ─── POST /api/patients/:patientId/records ─── (doctor attaches a record/prescription) */
exports.doctorAttachRecord = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const doctor_id      = req.user.id;
  const patient_id     = req.params.patientId;
  const appointment_id = req.body.appointment_id || null;
  const label          = req.body.label || 'Doctor Prescription';

  // Verify appointment
  const [check] = await pool.execute(
    `SELECT id FROM appointments WHERE doctor_id = ? AND patient_id = ? LIMIT 1`,
    [doctor_id, patient_id]
  );
  if (!check.length) return res.status(403).json({ error: 'No appointment with this patient' });

  try {
    const [result] = await pool.execute(
      `INSERT INTO medical_records
         (patient_id, uploaded_by, doctor_id, appointment_id, filename, filepath, label)
       VALUES (?, 'doctor', ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, appointment_id, req.file.originalname, req.file.path, label]
    );
    return res.status(201).json({ id: result.insertId, label, filename: req.file.originalname });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to attach record' });
  }
};
