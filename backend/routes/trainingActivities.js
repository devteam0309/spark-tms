const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  getTrainings, getTraining, createTraining, updateTraining, deleteTraining,
  changeStatus, updateLinks,
} = require('../controllers/trainingActivityController');

router.use(protect);

router.get('/', getTrainings);
router.post('/', createTraining);
router.get('/:id', getTraining);
router.put('/:id', updateTraining);
router.delete('/:id', deleteTraining);
router.patch('/:id/status', changeStatus);
router.patch('/:id/links', updateLinks);

module.exports = router;
