const jwt = require('jsonwebtoken');

/**
 * Middleware: verify JWT and attach req.user = { id, role }
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role: 'doctor'|'patient' }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware factory: restrict to a specific role
 */
const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ error: `Access restricted to ${role}s` });
  }
  next();
};

module.exports = { authenticate, requireRole };
