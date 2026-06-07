const express = require('express');
const router = express.Router();
const {
  login, getMe, updateProfile, changePassword,
  forceChangePassword, forgotPassword, resetPasswordByToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/force-change-password', protect, forceChangePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPasswordByToken);

module.exports = router;
