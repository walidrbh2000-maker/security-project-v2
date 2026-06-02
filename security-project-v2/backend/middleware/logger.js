const morgan = require('morgan');
morgan.token('body', (req) => {
  if (!req.body || Object.keys(req.body).length === 0) return '-';
  const s = { ...req.body };
  if (s.password) s.password = '[REDACTED]';
  if (s.currentPassword) s.currentPassword = '[REDACTED]';
  if (s.newPassword) s.newPassword = '[REDACTED]';
  return JSON.stringify(s);
});
const logFormat = ':method :url :status :response-time ms - body::body';
const logger = morgan(process.env.NODE_ENV === 'production' ? logFormat : 'dev');
module.exports = logger;
