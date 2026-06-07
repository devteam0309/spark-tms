const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`, { context: 'startup' });
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters', { context: 'startup' });
    process.exit(1);
  }
}

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (!isTest) {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down.' },
  });

  const exportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many export requests. Please wait before exporting again.' },
  });

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/exports', exportLimiter);
  app.use('/api', apiLimiter);
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/provinces', require('./routes/provinces'));
app.use('/api/target-sectors', require('./routes/targetSectors'));
app.use('/api/trainings', require('./routes/trainingActivities'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/exports', require('./routes/exports'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const { protect } = require('./middleware/auth');
const { authorize } = require('./middleware/roleCheck');
app.get('/api/health/detail', protect, authorize('spark_focal'), async (_req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'OK', db: dbState, timestamp: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  logger.error(err.message, { context: 'unhandled-error', stack: err.stack });
  res.status(500).json({
    message: isDev ? err.message : 'An internal server error occurred',
  });
});

module.exports = app;
