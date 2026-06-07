const User = require('../models/User');
const Province = require('../models/Province');
const AuditLog = require('../models/AuditLog');

const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('assignedProvince', 'name code').sort('-createdAt');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('assignedProvince');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, assignedProvince } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ message: 'Username or email already exists' });

    if (assignedProvince) {
      const province = await Province.findById(assignedProvince);
      if (!province) return res.status(404).json({ message: 'Assigned province not found' });
    }

    const user = await User.create({
      username, email, password, firstName, lastName, role,
      assignedProvince: assignedProvince || null,
      mustChangePassword: true,
    });

    await AuditLog.create({ user: req.user._id, action: 'USER_CREATED', details: { targetUser: user._id } });
    res.status(201).json(user.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role, assignedProvince, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    if (email !== undefined) {
      const conflict = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (conflict) return res.status(400).json({ message: 'Email is already in use by another account' });
      user.email = email;
    }

    if (role !== undefined) user.role = role;

    if (assignedProvince !== undefined) {
      if (assignedProvince) {
        const province = await Province.findById(assignedProvince);
        if (!province) return res.status(404).json({ message: 'Assigned province not found' });
      }
      user.assignedProvince = assignedProvince || null;
    }

    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const updated = await User.findById(user._id).populate('assignedProvince');
    await AuditLog.create({ user: req.user._id, action: 'USER_UPDATED', details: { targetUser: user._id } });
    res.json(updated.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'New password is required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = newPassword;
    user.mustChangePassword = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await AuditLog.create({ user: req.user._id, action: 'USER_PASSWORD_RESET', details: { targetUser: user._id } });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot delete your own account' });
    await User.findByIdAndDelete(req.params.id);
    await AuditLog.create({ user: req.user._id, action: 'USER_DELETED', details: { targetUser: req.params.id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const assignProvince = async (req, res) => {
  try {
    const { provinceId } = req.body;

    if (provinceId) {
      const province = await Province.findById(provinceId);
      if (!province) return res.status(404).json({ message: 'Province not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { assignedProvince: provinceId || null },
      { new: true }
    ).populate('assignedProvince');
    if (!user) return res.status(404).json({ message: 'User not found' });

    await AuditLog.create({ user: req.user._id, action: 'USER_PROVINCE_ASSIGNED', details: { targetUser: req.params.id, provinceId } });
    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, resetPassword, assignProvince };
