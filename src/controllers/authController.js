const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Admin, Manager, Teacher, Assistant } = require('../models');
require('dotenv').config();

// Hàm đăng nhập
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await Admin.findOne({ where: { email } });
        let userType = 'Admin';
        if (!user) {
            user = await Manager.findOne({ where: { email } });
            userType = 'Manager';
        }
        if (!user) {
            user = await Teacher.findOne({ where: { email } });
            userType = 'Teacher';
        }
        if (!user) {
            user = await Assistant.findOne({ where: { email } });
            userType = 'Assistant';
        }
        if (!user) {
            return res.status(401).json({ message: 'Email không tồn tại.' });
        }
        //check password
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Mật khẩu không đúng.' });
        }
        // Tạo token chứa id và loại người dùng
        const token = jwt.sign(
            { id: user.id, role: userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        return res.status(200).json({
            token,
            user: { id: user.id, email: user.email, role: userType, fullName: user.fullName }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Có lỗi xảy ra', error });
    }
};

// Hàm đăng xuất
exports.logout = async (req, res) => {
    return res.status(200).json({ message: 'Đăng xuất thành công.' });
};