const LEVELS = { error: 0, warn: 1, info: 2 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

// Minimal structured logger: timestamped, leveled, single-line JSON — easy for
// a log aggregator to parse, unlike bare console.log/error strings. No external
// dependency; this app's log volume doesn't justify pulling in winston/pino.
const write = (level, message, meta) => {
  if (LEVELS[level] > currentLevel) return;
  const entry = { timestamp: new Date().toISOString(), level, message };
  if (meta !== undefined) entry.meta = meta;
  (level === 'error' ? console.error : console.log)(JSON.stringify(entry));
};

module.exports = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
};
