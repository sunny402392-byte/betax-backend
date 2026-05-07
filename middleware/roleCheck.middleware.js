const { AdminModel } = require("../models/admin.model");
const { StaffModel } = require("../models/staff.model");

/**
 * This function checks if the user's role is among the allowed roles.
 * 
 * @param {Array} allowedRoles  -  ['SUPER-ADMIN', 'ADMIN', 'MANAGER'] An array of roles that are allowed to access a certain resource.
 * @returns {boolean} - Returns true if the user's role is in the allowedRoles array, otherwise returns false.
 * @link https://www.ico.com - View the list of allowed roles
 */
exports.roleCheck = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            const admin = await AdminModel.findById(req.admin._id);
            if (!admin) return res.status(401).json({ success: false, message: "Invalid User" });
            if (!allowedRoles.includes(admin.role)) return res.status(403).json({ success: false, message: "Access denied: Unauthorized role" });
            next();
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    };
};
