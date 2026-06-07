const Province = require('../models/Province');
const User = require('../models/User');
const TrainingActivity = require('../models/TrainingActivity');
const AuditLog = require('../models/AuditLog');

const getProvinces = async (req, res) => {
  try {
    const provinces = await Province.find().sort('name');
    res.json(provinces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProvince = async (req, res) => {
  try {
    const province = await Province.findById(req.params.id);
    if (!province) return res.status(404).json({ message: 'Province not found' });
    const focals = await User.find({ assignedProvince: req.params.id, role: 'province_focal' })
      .select('firstName lastName email username isActive');
    res.json({ ...province.toObject(), focals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createProvince = async (req, res) => {
  try {
    const { name, code, region } = req.body;
    const existing = await Province.findOne({ $or: [{ name }, { code: code?.toUpperCase() }] });
    if (existing) return res.status(400).json({ message: 'Province name or code already exists' });
    const province = await Province.create({ name, code, region });
    await AuditLog.create({ user: req.user._id, action: 'PROVINCE_CREATED', details: { provinceId: province._id } });
    res.status(201).json(province);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProvince = async (req, res) => {
  try {
    const { name, code, region, isActive } = req.body;

    if (name || code) {
      const orClauses = [];
      if (name) orClauses.push({ name });
      if (code) orClauses.push({ code: code.toUpperCase() });
      const conflict = await Province.findOne({ $or: orClauses, _id: { $ne: req.params.id } });
      if (conflict) return res.status(400).json({ message: 'Province name or code already exists' });
    }

    const province = await Province.findByIdAndUpdate(
      req.params.id,
      { name, code, region, isActive },
      { new: true, runValidators: true }
    );
    if (!province) return res.status(404).json({ message: 'Province not found' });
    res.json(province);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProvince = async (req, res) => {
  try {
    const province = await Province.findById(req.params.id);
    if (!province) return res.status(404).json({ message: 'Province not found' });

    const trainingCount = await TrainingActivity.countDocuments({ province: req.params.id });
    if (trainingCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${trainingCount} training record(s) are linked to this province. Deactivate it instead.`,
      });
    }

    await User.updateMany({ assignedProvince: req.params.id }, { $set: { assignedProvince: null } });
    await Province.findByIdAndDelete(req.params.id);
    await AuditLog.create({ user: req.user._id, action: 'PROVINCE_DELETED', details: { provinceId: req.params.id, name: province.name } });
    res.json({ message: 'Province deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProvinces, getProvince, createProvince, updateProvince, deleteProvince };
