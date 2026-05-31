const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/patientController');
const { authenticate, requireRole } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Patient's own profile & records
router.get('/profile',  authenticate, requireRole('patient'), ctrl.getProfile);
router.patch('/profile',authenticate, requireRole('patient'), ctrl.updateProfile);
router.get('/records',  authenticate, requireRole('patient'), ctrl.getRecords);
router.post('/records', authenticate, requireRole('patient'), upload.single('file'), ctrl.uploadRecord);

// Doctor accessing a patient's records (after booking)
router.get('/:patientId/records',   authenticate, requireRole('doctor'), ctrl.getDoctorViewRecords);
router.post('/:patientId/records',  authenticate, requireRole('doctor'), upload.single('file'), ctrl.doctorAttachRecord);

module.exports = router;
