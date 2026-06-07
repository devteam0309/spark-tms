const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  getUsers, getUser, createUser, updateUser, deleteUser, resetPassword, assignProvince,
} = require('../controllers/userController');

router.use(protect, authorize('spark_focal'));

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetPassword);
router.put('/:id/assign-province', assignProvince);

module.exports = router;
