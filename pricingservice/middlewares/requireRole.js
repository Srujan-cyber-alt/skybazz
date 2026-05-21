'use strict';

function requireRole(...roles) {
  const allowed = roles
    .map((role) => String(role || '').trim().toUpperCase())
    .filter(Boolean);

  return (req, res, next) => {
    const currentRole = String(req.user?.role || '').trim().toUpperCase();

    if (!currentRole || allowed.length === 0 || !allowed.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
        requiredRoles: allowed,
        requestId: req.context?.requestId || null,
      });
    }

    return next();
  };
}

module.exports = requireRole;