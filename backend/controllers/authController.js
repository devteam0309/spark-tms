const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendMail } = require('../utils/email');
const logger = require('../utils/logger');

const generateToken = (id, tokenVersion) =>
  jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Precomputed hash with no matching plaintext — used to give bcrypt.compare()
// the same amount of work for unknown/inactive usernames as for real ones, so
// response timing can't be used to enumerate valid accounts.
const DUMMY_HASH = '$2a$10$2tCyFSwSJIS665OvPpOYmu117QeRK9G1BP0NBxPLCVeTvWV.8xu.q';

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Please provide username and password' });

    const user = await User.findOne({
      $or: [{ username }, { email: username.toLowerCase() }],
    }).populate('assignedProvince');

    const isMatch = user
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !user.isActive || !isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({ user: user._id, action: 'USER_LOGIN' });

    res.json({ token: generateToken(user._id, user.tokenVersion), user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMe = async (req, res) => res.json(req.user);

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = await User.findById(req.user._id);
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) {
      const conflict = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (conflict) return res.status(400).json({ message: 'Email is already in use by another account' });
      user.email = email;
    }
    await user.save();
    await AuditLog.create({ user: req.user._id, action: 'PROFILE_UPDATED' });
    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Provide current and new password' });

    const user = await User.findById(req.user._id);
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    if (newPassword === currentPassword)
      return res.status(400).json({ message: 'New password must be different from your current password' });

    user.password = newPassword;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await AuditLog.create({ user: req.user._id, action: 'PASSWORD_CHANGED' });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Force change for mustChangePassword users — no currentPassword required
const forceChangePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await User.findById(req.user._id);
    if (!user.mustChangePassword)
      return res.status(400).json({ message: 'Password change is not required for this account' });

    if (await user.comparePassword(newPassword))
      return res.status(400).json({ message: 'New password must be different from your current password' });

    user.password = newPassword;
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLog.create({ user: req.user._id, action: 'FORCED_PASSWORD_CHANGED' });

    const token = generateToken(user._id, user.tokenVersion);
    const updated = await User.findById(user._id).populate('assignedProvince');
    res.json({ token, user: updated.toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Always respond with the same generic message regardless of whether the
    // account exists. The DB lookup + token write below run synchronously for
    // both branches (an indexed findOne takes the same time whether or not it
    // matches), so they don't leak account existence. The slow part —
    // sendMail(), which previously only ran for registered emails and could
    // take 200ms-2s — is dispatched via setImmediate() so it can never make
    // the response measurably slower for real accounts than for fake ones.
    const genericResponse = { message: 'If that email address is registered, a password reset link has been sent.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    let mailJob = null;

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
      mailJob = {
        to: user.email,
        subject: 'SPARK TMS — Password Reset Request',
        text: `Hello ${user.firstName},\n\nYou requested a password reset. Click the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email. Your password will remain unchanged.\n\nSPARK TMS — MIMAROPA Region`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1E3A8A; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">SPARK TMS — Password Reset</h2>
            </div>
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #374151; font-size: 15px;">Hello ${user.firstName},</p>
              <p style="color: #374151; font-size: 14px;">You requested a password reset for your SPARK TMS account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #1E3A8A; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600;">
                  Reset My Password
                </a>
              </div>
              <p style="color: #6b7280; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #1E3A8A; word-break: break-all;">${resetUrl}</a></p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                If you did not request a password reset, please ignore this email.<br>
                SPARK Training Monitoring System — MIMAROPA Region (Region IV-B)
              </p>
            </div>
          </div>
        `,
      };
    }

    res.json(genericResponse);

    if (mailJob) {
      setImmediate(() => {
        sendMail(mailJob).catch((e) => logger.error('Forgot-password email send failed', { context: 'forgot-password', error: e.message }));
      });
    }
  } catch (err) {
    logger.error('Forgot-password request failed', { context: 'forgot-password', error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPasswordByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });

    if (await user.comparePassword(newPassword))
      return res.status(400).json({ message: 'New password must be different from your current password' });

    user.password = newPassword;
    user.mustChangePassword = false;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLog.create({ user: user._id, action: 'PASSWORD_RESET_VIA_LINK' });
    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, getMe, updateProfile, changePassword, forceChangePassword, forgotPassword, resetPasswordByToken };
