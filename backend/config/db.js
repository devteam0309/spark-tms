const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`, { context: 'db' });
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`, { context: 'db' });
    process.exit(1);
  }
};

module.exports = connectDB;
