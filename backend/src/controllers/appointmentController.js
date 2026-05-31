const pool    = require('../config/db');
const bitmask = require('../services/bitmask');

/* ─── POST /api/appointments/book ─── (patient only) */
exports.bookAppointment = async (req, res) => {
  const { doctor_id, date, shift_no, start_slot, duration_minutes } = req.body;
  const patient_id = req.user.id;

  // ── 1. Input validation ──────────────────────────────────────────────────
  if (!doctor_id || !date || !shift_no || start_slot === undefined || !duration_minutes) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }
  if (shift_no < 1 || shift_no > 4) {
    return res.status(400).json({ error: 'shift_no must be 1-4' });
  }

  let numSlots, mask;
  try {
    numSlots = bitmask.durationToSlots(duration_minutes);
    if (start_slot + numSlots > 60) {
      return res.status(400).json({ error: 'booking_crosses_shift_boundary' });
    }
    mask = bitmask.generateMask(start_slot, numSlots);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // ── 2. Check doctor's shift preference ───────────────────────────────────
  const [docRows] = await pool.execute(
    `SELECT shift_mask, fee FROM doctors WHERE id = ? LIMIT 1`, [doctor_id]
  );
  if (!docRows.length) return res.status(404).json({ error: 'Doctor not found' });

  const { shift_mask, fee } = docRows[0];
  if (!bitmask.isShiftActive(shift_mask, shift_no)) {
    return res.status(403).json({ error: 'shift_disabled' });
  }

  const shiftCol = `shift_${shift_no}`;
  // Mask as string for MySQL (BIGINT UNSIGNED)
  const maskStr  = mask.toString();

  // Compute UTC datetimes
  const startTimeUtc = bitmask.toUTCDatetime(date, shift_no, start_slot);
  const endTimeUtc   = bitmask.toUTCDatetime(date, shift_no, start_slot + numSlots);

  // ── 3. BEGIN TRANSACTION ─────────────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Ensure schedule row exists
    await conn.execute(
      `INSERT IGNORE INTO schedules (doctor_id, date) VALUES (?, ?)`, [doctor_id, date]
    );

    // ── 4. Atomic wallet deduction ─────────────────────────────────────────
    const [walletResult] = await conn.execute(
      `UPDATE patients SET wallet = wallet - ? WHERE id = ? AND wallet >= ?`,
      [fee, patient_id, fee]
    );
    if (walletResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(402).json({ error: 'insufficient_funds' });
    }

    // ── 5. Atomic slot booking (re-verifies availability in WHERE clause) ──
    const [slotResult] = await conn.execute(
      `UPDATE schedules
       SET ${shiftCol} = ${shiftCol} | ?
       WHERE doctor_id = ? AND date = ? AND (${shiftCol} & ?) = 0`,
      [maskStr, doctor_id, date, maskStr]
    );
    if (slotResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'slot_unavailable' });
    }

    // ── 6. Create appointment record ───────────────────────────────────────
    const [apptResult] = await conn.execute(
      `INSERT INTO appointments
         (doctor_id, patient_id, date, shift_no, start_slot, duration_slots,
          slot_mask, start_time_utc, end_time_utc, fee_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doctor_id, patient_id, date, shift_no, start_slot, numSlots,
       maskStr, startTimeUtc, endTimeUtc, fee]
    );

    await conn.commit();
    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment_id: apptResult.insertId,
      start_time_utc: startTimeUtc,
      end_time_utc:   endTimeUtc,
      fee_paid: fee,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Booking failed' });
  } finally {
    conn.release();
  }
};

/* ─── POST /api/appointments/:id/cancel ─── (patient or doctor) */
exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  const conn = await pool.getConnection();
  try {
    // Fetch appointment
    const [rows] = await conn.execute(
      `SELECT * FROM appointments WHERE id = ? AND status = 'upcoming' LIMIT 1`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Appointment not found or not cancellable' });

    const appt = rows[0];

    // Authorisation: only the patient or doctor involved can cancel
    if (role === 'patient' && appt.patient_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (role === 'doctor' && appt.doctor_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const shiftCol = `shift_${appt.shift_no}`;
    const maskStr  = BigInt(appt.slot_mask).toString();

    await conn.beginTransaction();

    // Restore wallet to patient
    await conn.execute(
      `UPDATE patients SET wallet = wallet + ? WHERE id = ?`,
      [appt.fee_paid, appt.patient_id]
    );

    // Clear bitmask bits atomically
    // MySQL: shift_N & ~mask  — use BIGINT arithmetic
    await conn.execute(
      `UPDATE schedules SET ${shiftCol} = ${shiftCol} & ~?
       WHERE doctor_id = ? AND date = ?`,
      [maskStr, appt.doctor_id, appt.date]
    );

    // Update status
    await conn.execute(
      `UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [id]
    );

    await conn.commit();
    return res.json({ message: 'Appointment cancelled. Wallet refunded.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Cancellation failed' });
  } finally {
    conn.release();
  }
};

/* ─── GET /api/appointments/patient ─── (patient: their appointments) */
exports.patientAppointments = async (req, res) => {
  const patient_id = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, d.name AS doctor_name, d.specialization_tags
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = ?
       ORDER BY a.start_time_utc DESC`,
      [patient_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

/* ─── GET /api/appointments/doctor ─── (doctor: ordered by time) */
exports.doctorAppointments = async (req, res) => {
  const doctor_id = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, p.name AS patient_name, p.phone AS patient_phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ?
       ORDER BY a.start_time_utc ASC`,
      [doctor_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

/* ─── PATCH /api/appointments/:id/notes ─── (doctor: add notes) */
exports.addNotes = async (req, res) => {
  const { notes } = req.body;
  const { id }    = req.params;
  const doctor_id = req.user.id;
  try {
    const [result] = await pool.execute(
      `UPDATE appointments SET doctor_notes = ?, status = 'completed'
       WHERE id = ? AND doctor_id = ?`,
      [notes, id, doctor_id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ message: 'Notes saved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save notes' });
  }
};
