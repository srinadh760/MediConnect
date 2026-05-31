const router = require('express').Router();
const ctrl   = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/triage', authenticate, requireRole('patient'), ctrl.triageSymptoms);

module.exports = router;
