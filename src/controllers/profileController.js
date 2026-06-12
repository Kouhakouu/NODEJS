const bcrypt = require('bcrypt');
const db = require('../models');

const PROFILE_MODEL_BY_ROLE = {
    ADMIN: 'Admin',
    TEACHER: 'Teacher',
    ASSISTANT: 'Assistant',
    MANAGER: 'Manager',
    STUDENT: 'Student',
};

const getProfile = async (req, res) => {
    try {
        const { userId, role } = req.user;

        const modelName = PROFILE_MODEL_BY_ROLE[role];
        if (!modelName) return res.status(403).json({ message: 'Role không hỗ trợ.' });

        // User + profile theo role: 2 query độc lập, chạy song song
        const [user, row] = await Promise.all([
            db.User.findByPk(userId, { attributes: ['userId', 'email'] }),
            db[modelName].findOne({ where: { userId } })
        ]);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        let profile;
        if (role === 'STUDENT') {
            profile = {
                fullName: row?.fullName,
                DOB: row?.DOB,
                school: row?.school,
                parentPhoneNumber: row?.parentPhoneNumber,
                parentEmail: row?.parentEmail,
            };
        } else if (role === 'MANAGER') {
            profile = { fullName: row?.fullName, phoneNumber: row?.phoneNumber, gradeLevel: row?.gradeLevel };
        } else {
            profile = { fullName: row?.fullName, phoneNumber: row?.phoneNumber };
        }

        return res.json({ email: user.email, role, ...profile });
    } catch (e) {
        console.error('getProfile error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const body = req.body;

        switch (role) {
            case 'ADMIN':
                await db.Admin.update(
                    { fullName: body.fullName, phoneNumber: body.phoneNumber },
                    { where: { userId } }
                );
                break;
            case 'TEACHER':
                await db.Teacher.update(
                    { fullName: body.fullName, phoneNumber: body.phoneNumber },
                    { where: { userId } }
                );
                break;
            case 'ASSISTANT':
                await db.Assistant.update(
                    { fullName: body.fullName, phoneNumber: body.phoneNumber },
                    { where: { userId } }
                );
                break;
            case 'MANAGER':
                await db.Manager.update(
                    { fullName: body.fullName, phoneNumber: body.phoneNumber },
                    { where: { userId } }
                );
                break;
            case 'STUDENT':
                await db.Student.update(
                    {
                        fullName: body.fullName,
                        DOB: body.DOB,
                        school: body.school,
                        parentPhoneNumber: body.parentPhoneNumber,
                        parentEmail: body.parentEmail,
                    },
                    { where: { userId } }
                );
                break;
            default:
                return res.status(403).json({ message: 'Role không hỗ trợ.' });
        }

        return res.json({ message: 'Cập nhật thành công.' });
    } catch (e) {
        console.error('updateProfile error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { userId } = req.user;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        }

        const user = await db.User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid) return res.status(400).json({ message: 'Mật khẩu cũ không đúng.' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.User.update({ password: hashed }, { where: { userId } });

        return res.json({ message: 'Đổi mật khẩu thành công.' });
    } catch (e) {
        console.error('changePassword error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getProfile, updateProfile, changePassword };
