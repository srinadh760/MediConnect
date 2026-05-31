const pool    = require('../config/db');
const bitmask = require('../services/bitmask');

/**
 * Ensure a schedule row exists for doctor+date.
 * Uses INSERT IGNORE so concurrent requests don't conflict.
 */
async function ensureScheduleRow(doctorId, date, conn) {
  const db = conn || pool;
  await db.execute(
    `INSERT IGNORE INTO schedules (doctor_id, date) VALUES (?, ?)`,
    [doctorId, date]
  );
}

/* ─── GET /api/schedules/:doctorId/:date ─── */
/* Returns availability map for all 4 shifts for one date */
exports.getAvailability = async (req, res) => {
  const { doctorId, date } = req.params;
  try {
    // Get doctor's shift preferences
    const [docRows] = await pool.execute(
      `SELECT shift_mask FROM doctors WHERE id = ? LIMIT 1`, [doctorId]
    );
    if (!docRows.length) return res.status(404).json({ error: 'Doctor not found' });

    const shiftMask = docRows[0].shift_mask;
    await ensureScheduleRow(doctorId, date);

    const [rows] = await pool.execute(
      `SELECT shift_1, shift_2, shift_3, shift_4 FROM schedules WHERE doctor_id = ? AND date = ?`,
      [doctorId, date]
    );

    const schedule = rows[0] || { shift_1: '0', shift_2: '0', shift_3: '0', shift_4: '0' };

    const result = {};
    for (let s = 1; s <= 4; s++) {
      const active = bitmask.isShiftActive(shiftMask, s);
      result[`shift_${s}`] = {
        active,
        slots: active
          ? bitmask.buildAvailabilityMap(schedule[`shift_${s}`])
          : Array(60).fill(false), // all unavailable if shift disabled
      };
    }
    return res.json({ doctor_id: doctorId, date, shifts: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch availability' });
  }
};
