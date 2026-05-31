/**
 * ═══════════════════════════════════════════════════════════
 *  MEDICONNECT — 24-Hour Quad-Shift Bitmask Engine
 *  All operations use BigInt to avoid JS 32-bit overflow.
 * ═══════════════════════════════════════════════════════════
 *
 *  Shift layout (logical working day):
 *    Shift 1 → 08:00 – 13:00  (bits 0-59)
 *    Shift 2 → 14:00 – 19:00  (bits 0-59)
 *    Shift 3 → 20:00 – 01:00  (bits 0-59, crosses midnight)
 *    Shift 4 → 02:00 – 07:00  (bits 0-59, next morning)
 *
 *  Bit 0 = first 5-min slot of that shift
 *  Bit 59 = last 5-min slot of that shift
 *  0 = free, 1 = booked
 */

// Shift start hours in UTC offset (minutes from midnight of logical date)
const SHIFT_CONFIG = [
  { shift: 1, startMin: 8 * 60,           endMin: 13 * 60,          col: 'shift_1' },
  { shift: 2, startMin: 14 * 60,          endMin: 19 * 60,          col: 'shift_2' },
  { shift: 3, startMin: 20 * 60,          endMin: 25 * 60,          col: 'shift_3' }, // 25*60 = 1AM next day
  { shift: 4, startMin: 26 * 60,          endMin: 31 * 60,          col: 'shift_4' }, // 26*60 = 2AM next day
];

const SLOTS_PER_SHIFT = 60;
const SLOT_DURATION   = 5; // minutes

/**
 * Convert a time string "HH:MM" on a logical date into
 * { shiftNo, slotIndex, shiftConfig }
 *
 * @param {string} logicalDate  "YYYY-MM-DD" (the working-day date)
 * @param {string} timeStr      "HH:MM" (24-hour, local time passed as UTC)
 * @returns {{ shiftNo, slotIndex, col, startMin } | null}
 */
function resolveSlot(logicalDate, timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  // Minutes from midnight of the logical date
  let minutesFromMidnight = hh * 60 + mm;

  for (const cfg of SHIFT_CONFIG) {
    if (minutesFromMidnight >= cfg.startMin && minutesFromMidnight < cfg.endMin) {
      const slotIndex = (minutesFromMidnight - cfg.startMin) / SLOT_DURATION;
      if (!Number.isInteger(slotIndex)) return null; // must be on a 5-min boundary
      return { shiftNo: cfg.shift, slotIndex, col: cfg.col, cfg };
    }
  }
  return null; // falls in a break period or outside all shifts
}

/**
 * Convert slot index back to time string "HH:MM"
 */
function slotToTime(shiftNo, slotIndex) {
  const cfg = SHIFT_CONFIG[shiftNo - 1];
  const totalMin = cfg.startMin + slotIndex * SLOT_DURATION;
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Generate a contiguous BigInt bitmask.
 * N slots starting at position P.
 * Safe for all 60 slot positions (no 32-bit overflow).
 *
 * @param {number} startSlot  bit position (0-59)
 * @param {number} numSlots   count of slots to cover
 * @returns {bigint}
 */
function generateMask(startSlot, numSlots) {
  if (startSlot < 0 || numSlots <= 0 || startSlot + numSlots > SLOTS_PER_SHIFT) {
    throw new Error(`Invalid slot range: start=${startSlot}, count=${numSlots}`);
  }
  return ((1n << BigInt(numSlots)) - 1n) << BigInt(startSlot);
}

/**
 * Check if requested slots are free given the current shift integer.
 *
 * @param {string|bigint} shiftValue  current DB value (string from mysql2)
 * @param {bigint}        mask        request mask
 * @returns {boolean}  true = slots are free
 */
function areSlotsAvailable(shiftValue, mask) {
  const current = BigInt(shiftValue);
  return (current & mask) === 0n;
}

/**
 * Build the availability map for a shift integer.
 * Returns array of 60 booleans: true = free, false = booked.
 *
 * @param {string|bigint} shiftValue
 * @returns {boolean[]}
 */
function buildAvailabilityMap(shiftValue) {
  const val = BigInt(shiftValue);
  const map = [];
  for (let i = 0; i < SLOTS_PER_SHIFT; i++) {
    map.push((val & (1n << BigInt(i))) === 0n);
  }
  return map;
}

/**
 * Convert duration in minutes to slot count.
 * Validates it's a multiple of 5 min and within shift bounds.
 */
function durationToSlots(durationMinutes) {
  if (durationMinutes % SLOT_DURATION !== 0 || durationMinutes <= 0) {
    throw new Error(`Duration must be a positive multiple of ${SLOT_DURATION} minutes`);
  }
  return durationMinutes / SLOT_DURATION;
}

/**
 * Get shift config by shift number (1-4)
 */
function getShiftConfig(shiftNo) {
  return SHIFT_CONFIG[shiftNo - 1] || null;
}

/**
 * Get all shift configs
 */
function getAllShiftConfigs() {
  return SHIFT_CONFIG;
}

/**
 * Check if a shift is active for a doctor given their shift_mask.
 * shift_mask bit 0 = Shift 1, bit 1 = Shift 2, etc.
 *
 * @param {number} shiftMask   doctor's TINYINT shift_mask
 * @param {number} shiftNo     1-4
 * @returns {boolean}
 */
function isShiftActive(shiftMask, shiftNo) {
  return (shiftMask & (1 << (shiftNo - 1))) !== 0;
}

/**
 * Convert logical date + shift + slotIndex to a UTC datetime string.
 *
 * @param {string} logicalDate "YYYY-MM-DD"
 * @param {number} shiftNo     1-4
 * @param {number} slotIndex   0-59
 * @returns {string} ISO datetime
 */
function toUTCDatetime(logicalDate, shiftNo, slotIndex) {
  const cfg = SHIFT_CONFIG[shiftNo - 1];
  const totalMinutes = cfg.startMin + slotIndex * SLOT_DURATION;
  const date = new Date(`${logicalDate}T00:00:00.000Z`);
  date.setUTCMinutes(date.getUTCMinutes() + totalMinutes);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  generateMask,
  areSlotsAvailable,
  buildAvailabilityMap,
  durationToSlots,
  resolveSlot,
  slotToTime,
  getShiftConfig,
  getAllShiftConfigs,
  isShiftActive,
  toUTCDatetime,
  SLOTS_PER_SHIFT,
  SLOT_DURATION,
  SHIFT_CONFIG,
};
