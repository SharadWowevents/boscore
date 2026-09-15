const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // Expects "Bearer <token>"

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verifies using the shared JWT_SECRET from your central auth server
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Maps the central SSO ID to req.user so your routes don't break
    // Supports whether your SSO signs the payload as { id: ... } or { userId: ... }
    req.user = { id: decoded.id || decoded.userId }; 
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};