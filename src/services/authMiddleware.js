const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ "Authorization: Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Không có token, truy cập bị từ chối.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token không hợp lệ.' });
        }

        req.user = decoded; // Gán user vào request: { userId, role }
        next();
    });
};

// Chặn theo vai trò — dùng SAU authMiddleware: requireRole('ADMIN', 'MANAGER')
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
    }
    next();
};

module.exports = { authMiddleware, requireRole };
