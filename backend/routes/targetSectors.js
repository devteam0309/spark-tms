const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  getTargetSectors, createTargetSector, updateTargetSector, deleteTargetSector,
} = require('../controllers/targetSectorController');

router.get('/', protect, getTargetSectors);
router.post('/', protect, authorize('spark_focal'), createTargetSector);
router.put('/:id', protect, authorize('spark_focal'), updateTargetSector);
router.delete('/:id', protect, authorize('spark_focal'), deleteTargetSector);

module.exports = router;
