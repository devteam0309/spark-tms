const TargetSector = require('../models/TargetSector');
const TrainingActivity = require('../models/TrainingActivity');
const AuditLog = require('../models/AuditLog');

const getTargetSectors = async (req, res) => {
  try {
    const sectors = await TargetSector.find().sort('name');
    res.json(sectors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createTargetSector = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

    const existing = await TargetSector.findOne({ name: name.trim() });
    if (existing) return res.status(400).json({ message: 'Target sector already exists' });

    const sector = await TargetSector.create({ name: name.trim() });
    await AuditLog.create({ user: req.user._id, action: 'TARGET_SECTOR_CREATED', details: { sectorId: sector._id, name: sector.name } });
    res.status(201).json(sector);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTargetSector = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (name?.trim()) {
      const conflict = await TargetSector.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
      if (conflict) return res.status(400).json({ message: 'Target sector already exists' });
    }

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (isActive !== undefined) update.isActive = isActive;

    const sector = await TargetSector.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!sector) return res.status(404).json({ message: 'Target sector not found' });
    res.json(sector);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteTargetSector = async (req, res) => {
  try {
    const sector = await TargetSector.findById(req.params.id);
    if (!sector) return res.status(404).json({ message: 'Target sector not found' });

    const trainingCount = await TrainingActivity.countDocuments({ targetSector: sector.name });
    if (trainingCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${trainingCount} training record(s) use this sector. Deactivate it instead.`,
      });
    }

    await TargetSector.findByIdAndDelete(req.params.id);
    await AuditLog.create({ user: req.user._id, action: 'TARGET_SECTOR_DELETED', details: { sectorId: req.params.id, name: sector.name } });
    res.json({ message: 'Target sector deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTargetSectors, createTargetSector, updateTargetSector, deleteTargetSector };
