// controllers/managerController.js

const bcrypt = require('bcryptjs');
const db = require('../models');

// Lấy thông tin tất cả các manager kèm email từ User

const getManagerInfo = async (req, res) => {
    try {
        const managers = await db.Manager.findAll({
            attributes: ['userId', 'fullName', 'phoneNumber', 'gradeLevel'],
            include: [{
                model: db.User,
                as: 'user',
                attributes: ['email']
            }]
        });

        const result = managers.map(m => ({
            userId: m.userId,
            fullName: m.fullName,
            phoneNumber: m.phoneNumber,
            gradeLevel: m.gradeLevel,
            email: m.user?.email || null
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('getManagerInfo error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Tạo mới Manager (User + Manager profile)
const createManager = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, gradeLevel } = req.body;
        if (!fullName || !email || !password || !gradeLevel) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await db.User.create({
            email,
            password: hashed,
            roleId: 3 // roleId của Manager
        });

        const manager = await db.Manager.create({
            userId: user.userId,
            fullName,
            phoneNumber,
            gradeLevel
        });

        return res.status(201).json({
            message: 'Tạo quản lý thành công!',
            manager: {
                userId: manager.userId,
                fullName: manager.fullName,
                phoneNumber: manager.phoneNumber,
                gradeLevel: manager.gradeLevel,
                email: user.email
            }
        });
    } catch (error) {
        console.error('createManager error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Cập nhật Manager và User kèm gradeLevel
const updateManager = async (req, res) => {
    try {
        const managerId = parseInt(req.params.id, 10);
        const { fullName, email, phoneNumber, password, gradeLevel } = req.body;

        const manager = await db.Manager.findByPk(managerId);
        if (!manager) return res.status(404).json({ message: 'Manager not found.' });

        const user = await db.User.findByPk(managerId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);
        await user.save();

        if (fullName) manager.fullName = fullName;
        if (phoneNumber) manager.phoneNumber = phoneNumber;
        if (gradeLevel) manager.gradeLevel = gradeLevel;
        await manager.save();

        return res.status(200).json({
            message: 'Cập nhật quản lý thành công!',
            manager: {
                userId: manager.userId,
                fullName: manager.fullName,
                phoneNumber: manager.phoneNumber,
                gradeLevel: manager.gradeLevel,
                email: user.email
            }
        });
    } catch (error) {
        console.error('updateManager error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Xóa Manager (thực chất xóa User, cascade sẽ xóa Manager)
const deleteManager = async (req, res) => {
    try {
        const managerId = parseInt(req.params.id, 10);
        const deleted = await db.User.destroy({ where: { userId: managerId } });
        if (!deleted) return res.status(404).json({ message: 'Manager/User not found.' });
        return res.status(200).json({ message: 'Xóa quản lý thành công!' });
    } catch (error) {
        console.error('deleteManager error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Lấy danh sách lớp theo gradeLevel của Manager (trang quản lý)
const getManagerClasses = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const manager = await db.Manager.findByPk(managerId, {
            attributes: ['gradeLevel']
        });
        if (!manager) return res.status(404).json({ message: 'Manager not found' });

        const classes = await db.Class.findAll({
            where: { gradeLevel: manager.gradeLevel },
            attributes: [
                'id',
                'className',
                'gradeLevel',
                [db.sequelize.fn('COUNT', db.sequelize.col('students.id')), 'studentsCount'],
                'class_schedule_id'
            ],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['id', 'study_day', 'start_time', 'end_time']
                },
                {
                    model: db.Student,
                    as: 'students',
                    attributes: [],
                    through: { attributes: [] }
                }
            ],
            group: [
                'Class.id',
                'Class.className',
                'Class.gradeLevel',
                'Class.class_schedule_id',
                'classSchedule.id',
                'classSchedule.study_day',
                'classSchedule.start_time',
                'classSchedule.end_time'
            ]
        });

        const result = classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: parseInt(c.get('studentsCount'), 10),
            classSchedule: c.classSchedule
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('getManagerClasses error:', error);
        return res.status(500).json({ message: 'Error fetching manager classes' });
    }
};

// Tạo buổi học cho Manager
const createLesson = async (req, res) => {
    try {
        const { lessonDate, classId } = req.body;
        if (!lessonDate || !classId) {
            return res.status(400).json({ message: 'lessonDate và classId là bắt buộc' });
        }

        const newLesson = await db.Lesson.create({
            lessonContent: '',
            totalTaskLength: '',
            lessonDate,
        });

        const newLessonClass = await db.LessonClass.create({
            lessonId: newLesson.id,
            classId
        });

        return res.status(201).json({
            message: 'Tạo mới buổi học thành công!',
            lesson: newLesson,
            lessonClass: newLessonClass
        });
    } catch (error) {
        console.error('createLesson error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

const getClassStudents = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        // Lấy lớp và include students qua quan hệ many-to-many
        const cls = await db.Class.findByPk(classId, {
            attributes: ['id', 'className'],
            include: [{
                model: db.Student,
                as: 'students',
                attributes: [
                    'id',
                    'fullName',
                    'DOB',
                    'school',
                    'parentPhoneNumber',
                    'parentEmail'
                ],
                through: { attributes: [] }
            }]
        });

        if (!cls) {
            return res.status(404).json({ message: 'Class not found' });
        }

        return res.status(200).json({
            id: cls.id,
            className: cls.className,
            students: cls.students
        });
    } catch (error) {
        console.error('getClassStudents error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getManagerInfo,
    createManager,
    updateManager,
    deleteManager,
    getManagerClasses,
    createLesson,
    getClassStudents
};
