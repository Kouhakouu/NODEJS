// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
    User,
    Role,
    Admin,
    Assistant,
    Teacher,
    Manager
} = require('../models');
require('dotenv').config();

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Tìm user
        const user = await User.findOne({
            where: { email },
            include: [
                { model: Role, as: 'role', attributes: ['roleName'] },
                { model: Admin, as: 'adminProfile', attributes: ['fullName'] },
                { model: Assistant, as: 'assistantProfile', attributes: ['fullName'] },
                { model: Teacher, as: 'teacherProfile', attributes: ['fullName'] },
                { model: Manager, as: 'managerProfile', attributes: ['fullName', 'gradeLevel'] }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: 'Email không tồn tại.' });
        }

        // 2. So sánh mật khẩu
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: 'Mật khẩu không đúng.' });
        }

        // 3. Lấy roleName và fullName từ đúng profile
        const roleName = user.role.roleName;
        let fullName = null, gradeLevel = null;
        switch (roleName) {
            case 'Admin':
                fullName = user.adminProfile?.fullName;
                break;
            case 'Assistant':
                fullName = user.assistantProfile?.fullName;
                break;
            case 'Teacher':
                fullName = user.teacherProfile?.fullName;
                break;
            case 'Manager':
                fullName = user.managerProfile?.fullName;
                gradeLevel = user.managerProfile?.gradeLevel;
                break;
        }

        // 4. Tạo token
        const token = jwt.sign(
            { userId: user.userId, role: roleName },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 5. Trả về
        return res.json({
            token,
            user: {
                id: user.userId,
                email: user.email,
                role: roleName,
                fullName,
                ...(gradeLevel && { gradeLevel })
            }
        });

    } catch (err) {
        console.error(
            err.original?.errors?.map(e => e.message) || err.message
        );
        return res.status(500).json({ message: 'Login failed' });
    }
};

exports.logout = (_req, res) => {
    return res.json({ message: 'Đăng xuất thành công.' });
};
