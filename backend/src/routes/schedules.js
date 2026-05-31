const router = require('express').Router();
const ctrl   = require('../controllers/scheduleController');
const { authenticate } = require('../middleware/auth');

router.get('/:doctorId/:date', ctrl.getAvailability);

module.exports = router;
