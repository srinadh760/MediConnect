-- MediConnect Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS mediconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediconnect;

-- ─────────────────────────────────────────
-- DOCTORS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(100)     NOT NULL,
  email               VARCHAR(150)     NOT NULL UNIQUE,
  password            VARCHAR(255)     NOT NULL,
  bio                 TEXT,
  specialization_tags JSON             NOT NULL DEFAULT (JSON_ARRAY()),
  shift_mask          TINYINT UNSIGNED NOT NULL DEFAULT 15,  -- 0b1111 = all shifts
  fee                 INT UNSIGNED     NOT NULL DEFAULT 300,
  languages           JSON             DEFAULT NULL,
  rating_sum          INT UNSIGNED     NOT NULL DEFAULT 0,
  rating_count        INT UNSIGNED     NOT NULL DEFAULT 0,
  created_at          DATETIME         DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(20),
  dob        DATE,
  wallet     INT UNSIGNED NOT NULL DEFAULT 500,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- SCHEDULES  (bitmask occupancy per working day)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  date      DATE         NOT NULL,          -- logical working day (see plan)
  shift_1   BIGINT UNSIGNED NOT NULL DEFAULT 0,   -- bits 0-59: 8AM-1PM
  shift_2   BIGINT UNSIGNED NOT NULL DEFAULT 0,   -- bits 0-59: 2PM-7PM
  shift_3   BIGINT UNSIGNED NOT NULL DEFAULT 0,   -- bits 0-59: 8PM-1AM
  shift_4   BIGINT UNSIGNED NOT NULL DEFAULT 0,   -- bits 0-59: 2AM-7AM
  UNIQUE KEY uq_doctor_date (doctor_id, date),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id      INT UNSIGNED NOT NULL,
  patient_id     INT UNSIGNED NOT NULL,
  date           DATE         NOT NULL,              -- logical working day
  shift_no       TINYINT UNSIGNED NOT NULL,          -- 1 | 2 | 3 | 4
  start_slot     TINYINT UNSIGNED NOT NULL,          -- bit position 0-59
  duration_slots TINYINT UNSIGNED NOT NULL,          -- number of 5-min slots
  slot_mask      BIGINT UNSIGNED  NOT NULL,          -- the exact mask used
  start_time_utc DATETIME         NOT NULL,
  end_time_utc   DATETIME         NOT NULL,
  fee_paid       INT UNSIGNED     NOT NULL,
  status         ENUM('upcoming','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  doctor_notes   TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- MEDICAL RECORDS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT UNSIGNED NOT NULL,
  uploaded_by    ENUM('patient','doctor') NOT NULL,
  doctor_id      INT UNSIGNED,                         -- NULL if uploaded by patient
  appointment_id INT UNSIGNED,                         -- NULL if general record
  filename       VARCHAR(255) NOT NULL,
  filepath       VARCHAR(500) NOT NULL,
  label          VARCHAR(200),
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- REVIEWS  (one per patient-doctor pair, updatable)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id  INT UNSIGNED NOT NULL,
  patient_id INT UNSIGNED NOT NULL,
  rating     TINYINT UNSIGNED NOT NULL,    -- 1-5
  comment    TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patient_doctor (patient_id, doctor_id),
  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- INDEXES  (performance critical)
-- ─────────────────────────────────────────
CREATE INDEX idx_schedule_doctor_date   ON schedules    (doctor_id, date);
CREATE INDEX idx_appt_doctor_time       ON appointments (doctor_id, start_time_utc);
CREATE INDEX idx_appt_patient           ON appointments (patient_id);
CREATE INDEX idx_records_patient        ON medical_records (patient_id);
