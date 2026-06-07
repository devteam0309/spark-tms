const dotenv = require('dotenv');
dotenv.config();

const logger = require('./utils/logger');

const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing required environment variables: ${missing.join(', ')}`, { context: 'startup' });
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET must be at least 32 characters', { context: 'startup' });
  process.exit(1);
}

// Last-resort safety net: log and keep serving rather than letting a single
// bad request (e.g. a thrown error in an async route handler that nobody
// awaited/caught) take down the whole process for every other user.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { context: 'fatal', reason: reason?.stack || reason });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { context: 'fatal', stack: err.stack });
});

const connectDB = require('./config/db');
connectDB();

const app = require('./app');

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(`SPARK TMS Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`, { context: 'startup' });
});
