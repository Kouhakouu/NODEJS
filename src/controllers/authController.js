// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
    sequelize,
    User,
    Role,
    Admin,
    Assistant,
    Teacher,
    Manager,
    Student
} = require('../models');
require('dotenv').config();
//API đăng nhập
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Tìm user
        const user = await User.findOne({
            where: { email },
            include: [
                { model: Role, as: 'role', attributes: ['roleName'] },
                { model: Admin, as: 'adminProfile', attributes: ['fullName'] },
                { model: Assistant, as: 'assistantProfile', attributes: ['fullName', 'status'] },
                { model: Teacher, as: 'teacherProfile', attributes: ['fullName'] },
                { model: Manager, as: 'managerProfile', attributes: ['fullName', 'gradeLevel'] },
                { model: Student, as: 'studentProfile', attributes: ['fullName'] }
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
        let fullName = null, gradeLevel = null, status = null;
        switch (roleName) {
            case 'ADMIN':
                fullName = user.adminProfile?.fullName;
                break;
            case 'ASSISTANT':
                fullName = user.assistantProfile?.fullName;
                status = user.assistantProfile?.status ?? 0;
                break;
            case 'TEACHER':
                fullName = user.teacherProfile?.fullName;
                break;
            case 'MANAGER':
                fullName = user.managerProfile?.fullName;
                gradeLevel = user.managerProfile?.gradeLevel;
                break;
            case 'STUDENT':
                fullName = user.studentProfile?.fullName;
                break;
        }

        // 4. Tạo token
        const token = jwt.sign(
            { userId: user.userId, role: roleName },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // 5. Trả về
        return res.json({
            token,
            user: {
                id: user.userId,
                email: user.email,
                role: roleName,
                fullName,
                ...(gradeLevel && { gradeLevel }),
                ...(status !== null && { status })
            }
        });

    } catch (err) {
        console.error(
            err.original?.errors?.map(e => e.message) || err.message
        );
        return res.status(500).json({ message: 'Login failed' });
    }
};

// API đăng ký dành cho học sinh — xử lý 2 trường hợp:
// 1. Hồ sơ học sinh đã được admin nhập sẵn (tìm theo fullName + DOB) → tạo User rồi gán userId
// 2. Học sinh hoàn toàn mới → tạo cả User lẫn Student
exports.registerStudent = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { email, password, fullName, DOB, school, parentPhoneNumber, parentEmail } = req.body;

        if (!email || !password || !fullName || !DOB) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ các trường bắt buộc.' });
        }

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email này đã được sử dụng.' });
        }

        // Lấy role Student
        const studentRole = await Role.findOne({ where: { roleName: 'STUDENT' } });
        if (!studentRole) {
            return res.status(500).json({ message: 'Lỗi server: Chưa cấu hình Role cho Học sinh.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo tài khoản User trước
        const newUser = await User.create({
            email,
            password: hashedPassword,
            roleId: studentRole.roleId
        }, { transaction: t });

        // Tìm hồ sơ học sinh đã có sẵn theo fullName + DOB
        const existingStudent = await Student.findOne({ where: { fullName, DOB } });

        if (existingStudent) {
            // Hồ sơ tồn tại — kiểm tra đã có tài khoản chưa
            if (existingStudent.userId !== null) {
                await t.rollback();
                return res.status(400).json({ message: 'Hồ sơ học sinh này đã được liên kết với một tài khoản khác.' });
            }
            // Gán userId vào hồ sơ cũ
            await existingStudent.update({ userId: newUser.userId }, { transaction: t });
        } else {
            // Chưa có hồ sơ — tạo mới hoàn toàn
            await Student.create({
                userId: newUser.userId,
                fullName,
                DOB,
                school: school || null,
                parentPhoneNumber: parentPhoneNumber || null,
                parentEmail: parentEmail || null
            }, { transaction: t });
        }

        await t.commit();
        return res.status(201).json({
            message: 'Đăng ký tài khoản thành công.',
            studentInfo: { email, fullName }
        });

    } catch (err) {
        await t.rollback();
        console.error('Lỗi đăng ký:', err);
        return res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình đăng ký.' });
    }
};


//API đăng xuất
exports.logout = (_req, res) => {
    return res.json({ message: 'Đăng xuất thành công.' });
};
