const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
require('dotenv').config();

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Tạo truy vấn sử dụng CTE kết hợp dữ liệu từ bốn bảng
        const users = await sequelize.query(
            `
      WITH userCTE (id, email, password, fullName, role) AS (
        SELECT id, email, password, fullName, 'Admin' FROM "Admins"
        UNION ALL
        SELECT id, email, password, fullName, 'Manager' FROM "Managers"
        UNION ALL
        SELECT id, email, password, fullName, 'Teacher' FROM "Teachers"
        UNION ALL
        SELECT id, email, password, fullName, 'Assistant' FROM "Assistants"
      )
      SELECT * FROM userCTE
      WHERE email = :email
      `,
            {
                replacements: { email },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        // Kiểm tra xem có tìm thấy người dùng hay không
        const user = users[0];
        if (!user) {
            return res.status(401).json({ message: 'Email không tồn tại.' });
        }

        // So sánh mật khẩu hash
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Mật khẩu không đúng.' });
        }

        // Tạo JSON Web Token chứa id và role của người dùng
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                fullName: user.fullName,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Có lỗi xảy ra', error });
    }
};

exports.logout = (req, res) => {
    return res.status(200).json({ message: 'Đăng xuất thành công.' });
};
