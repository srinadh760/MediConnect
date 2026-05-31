const router  = require('express').Router();
const ctrl    = require('../controllers/doctorController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/',          ctrl.listDoctors);
router.get('/:id',       ctrl.getDoctor);
router.patch('/profile', authenticate, requireRole('doctor'), ctrl.updateProfile);

module.exports = router;
