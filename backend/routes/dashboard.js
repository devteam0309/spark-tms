const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { getSparkFocalDashboard, getProvinceFocalDashboard } = require('../controllers/dashboardController');

router.get('/spark', protect, authorize('spark_focal'), getSparkFocalDashboard);
router.get('/province', protect, authorize('province_focal'), getProvinceFocalDashboard);

module.exports = router;
