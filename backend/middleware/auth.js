const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'modest_restaurant_production_jwt_secret_key_9824';

const authMiddleware = (req, res, next) => {
  // Read JWT from httpOnly cookies
  const token = req.cookies ? req.cookies.access_token : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Session expired or missing.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session invalid or token expired. Please log in again.' });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Access restricted.' });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  SECRET_KEY
};
