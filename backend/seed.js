require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const specializations = [
  ['cardiologist', 'heart', 'cardiology'],
  ['dermatologist', 'skin', 'dermatology'],
  ['neurologist', 'brain', 'nerves'],
  ['pediatrician', 'child', 'kids'],
  ['orthopedic', 'bones', 'joints'],
  ['psychiatrist', 'mental', 'therapy'],
  ['gynecologist', 'women', 'health'],
  ['dentist', 'teeth', 'dental'],
  ['ophthalmologist', 'eyes', 'vision'],
  ['general', 'fever', 'cough', 'cold']
];

const LANGUAGES = ['English', 'Spanish', 'Hindi', 'French', 'Mandarin', 'Arabic', 'Telugu', 'Tamil', 'German'];

async function seed() {
  console.log('Connecting to database...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mediconnect',
    supportBigNumbers: true,
    bigNumberStrings: true,
  });

  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. CLEAR EXISTING DATA to avoid unique constraint errors (optional, but good for fresh 100)
    console.log('Clearing existing data...');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute('TRUNCATE TABLE reviews');
    await pool.execute('TRUNCATE TABLE medical_records');
    await pool.execute('TRUNCATE TABLE appointments');
    await pool.execute('TRUNCATE TABLE schedules');
    await pool.execute('TRUNCATE TABLE patients');
    await pool.execute('TRUNCATE TABLE doctors');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Creating 100 doctors...');
    let doctorIds = [];
    for (let i = 0; i < 100; i++) {
      const name = faker.person.fullName({ title: 'Dr.' });
      const email = faker.internet.email({ firstName: name.split(' ')[1] }).toLowerCase();
      const tags = JSON.stringify(faker.helpers.arrayElement(specializations));
      const bio = faker.lorem.paragraph();
      const fee = faker.number.int({ min: 3, max: 20 }) * 100;
      const shiftMask = faker.number.int({ min: 1, max: 15 });
      const docLanguages = JSON.stringify(faker.helpers.arrayElements(LANGUAGES, faker.number.int({ min: 1, max: 3 })));
      
      const [result] = await pool.execute(
        'INSERT INTO doctors (name, email, password, specialization_tags, bio, fee, shift_mask, languages) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, email, passwordHash, tags, bio, fee, shiftMask, docLanguages]
      );
      doctorIds.push(result.insertId);
    }

    console.log('Creating 100 patients...');
    let patientIds = [];
    for (let i = 0; i < 100; i++) {
      const name = faker.person.fullName();
      const email = faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase();
      const phone = faker.phone.number().slice(0, 20);
      const wallet = faker.number.int({ min: 10, max: 200 }) * 100;
      
      const [result] = await pool.execute(
        'INSERT INTO patients (name, email, password, phone, wallet) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, phone, wallet]
      );
      patientIds.push(result.insertId);
    }

    console.log('Generating reviews...');
    // Each doctor gets 1-5 reviews
    for (const docId of doctorIds) {
      const reviewCount = faker.number.int({ min: 1, max: 5 });
      let ratingSum = 0;
      const selectedPatients = faker.helpers.arrayElements(patientIds, reviewCount);
      
      for (const patId of selectedPatients) {
        const rating = faker.number.int({ min: 1, max: 5 });
        ratingSum += rating;
        const comment = faker.helpers.maybe(() => faker.lorem.sentences(2), { probability: 0.8 }) || '';
        
        await pool.execute(
          'INSERT INTO reviews (doctor_id, patient_id, rating, comment) VALUES (?, ?, ?, ?)',
          [docId, patId, rating, comment]
        );
      }
      
      // Update doctor rating summary
      await pool.execute(
        'UPDATE doctors SET rating_sum = ?, rating_count = ? WHERE id = ?',
        [ratingSum, reviewCount, docId]
      );
    }

    console.log('Generating medical records...');
    // Generate some records uploaded by patients, some by doctors
    for (const patId of patientIds) {
      const recordCount = faker.number.int({ min: 0, max: 3 });
      for (let i = 0; i < recordCount; i++) {
        const byDoctor = faker.datatype.boolean();
        const uploader = byDoctor ? 'doctor' : 'patient';
        const docId = byDoctor ? faker.helpers.arrayElement(doctorIds) : null;
        
        const label = faker.helpers.arrayElement(['Blood Test Report', 'Prescription', 'X-Ray Result', 'General Checkup Notes']);
        const filename = faker.system.fileName() + '.pdf';
        const filepath = 'dummy_path/' + filename;
        
        await pool.execute(
          'INSERT INTO medical_records (patient_id, uploaded_by, doctor_id, filename, filepath, label) VALUES (?, ?, ?, ?, ?, ?)',
          [patId, uploader, docId, filename, filepath, label]
        );
      }
    }

    console.log('✅ Generated 100 doctors, 100 patients, reviews, and medical records successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await pool.end();
  }
}

seed();
