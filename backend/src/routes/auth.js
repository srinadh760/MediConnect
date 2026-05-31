const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/signup', ctrl.signup);
router.post('/login',  ctrl.login);
router.get('/me',      authenticate, ctrl.me);

module.exports = router;
