const router = require('express').Router();
const ctrl   = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/',           authenticate, requireRole('patient'), ctrl.upsertReview);
router.get('/:doctorId',   ctrl.getDoctorReviews);

module.exports = router;
