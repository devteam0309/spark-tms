const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  getProvinces, getProvince, createProvince, updateProvince, deleteProvince,
} = require('../controllers/provinceController');

router.get('/', protect, getProvinces);
router.get('/:id', protect, getProvince);
router.post('/', protect, authorize('spark_focal'), createProvince);
router.put('/:id', protect, authorize('spark_focal'), updateProvince);
router.delete('/:id', protect, authorize('spark_focal'), deleteProvince);

module.exports = router;
