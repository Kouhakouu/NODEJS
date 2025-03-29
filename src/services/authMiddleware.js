const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ "Authorization: Bearer <token>"

    console.log("🔹 Token nhận được từ request:", token);

    if (!token) {
        console.warn("⚠ Không có token trong request!");
        return res.status(401).json({ message: 'Không có token, truy cập bị từ chối.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("❌ Lỗi xác thực token:", err);
            return res.status(401).json({ message: 'Token không hợp lệ.' });
        }

        console.log("✅ Token hợp lệ, decoded user:", decoded);
        req.user = decoded; // Gán user vào request
        next();
    });
};

module.exports = { authMiddleware };
