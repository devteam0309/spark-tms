const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('assignedProvince').select('-password');
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== req.user.tokenVersion) {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

module.exports = { protect };
