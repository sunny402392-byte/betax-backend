exports.checkRole = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access Denied!" });
      }
      next();
    };
  };

  exports.checkRoleMiddleware = (user,...allowedRoles) => {
    if (!user || !allowedRoles.includes(user.role)) {
      return false
    }
    return true
  };