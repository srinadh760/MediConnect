const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const ctrl   = require('../controllers/appointmentController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/book',              authenticate, requireRole('patient'), ctrl.bookAppointment);
router.post('/:id/cancel',        authenticate, ctrl.cancelAppointment);
router.get('/patient',            authenticate, requireRole('patient'), ctrl.patientAppointments);
router.get('/doctor',             authenticate, requireRole('doctor'),  ctrl.doctorAppointments);
router.patch('/:id/notes',        authenticate, requireRole('doctor'),  ctrl.addNotes);

module.exports = router;
