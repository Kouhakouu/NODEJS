// controllers/teacherController.js

const bcrypt = require('bcryptjs');
const db = require('../models');

//trang admin
const getTeacherInfo = async (req, res) => {
    try {
        const teachers = await db.Teacher.findAll({
            attributes: ['userId', 'fullName', 'phoneNumber'],
            include: [{
                model: db.User,
                as: 'user',
                attributes: ['email']
            }]
        });

        const result = teachers.map(t => ({
            userId: t.userId,
            fullName: t.fullName,
            phoneNumber: t.phoneNumber,
            email: t.user?.email || null
        }));

        return res.json(result);
    } catch (e) {
        console.error('getTeacherInfo error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const createTeacher = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;

        // 1. Kiểm tra input
        if (!fullName || !email || !phoneNumber || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }

        // 2. Hash password
        const hashed = await bcrypt.hash(password, 10);

        // 3. Tạo user mới với roleId = 2
        const user = await db.User.create({
            email,
            password: hashed,
            roleId: 2       // Teacher
        });

        // 4. Tạo teacher profile
        const teacher = await db.Teacher.create({
            userId: user.userId,
            fullName,
            phoneNumber
        });

        // 5. Trả về kết quả
        return res.status(201).json({
            message: 'Tạo giáo viên thành công!',
            teacher: {
                userId: user.userId,
                fullName: teacher.fullName,
                phoneNumber: teacher.phoneNumber,
                email: user.email
            }
        });
    } catch (error) {
        console.error('createTeacher error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const teacherId = parseInt(req.params.id, 10);
        const { fullName, email, phoneNumber, password } = req.body;

        const teacher = await db.Teacher.findByPk(teacherId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

        const user = await db.User.findByPk(teacherId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);
        await user.save();

        if (fullName) teacher.fullName = fullName;
        if (phoneNumber) teacher.phoneNumber = phoneNumber;
        await teacher.save();

        return res.json({
            message: 'Teacher updated successfully!',
            teacher: {
                userId: teacher.userId,
                fullName: teacher.fullName,
                phoneNumber: teacher.phoneNumber,
                email: user.email
            }
        });
    } catch (e) {
        console.error('updateTeacher error:', e);
        return res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const teacherId = parseInt(req.params.id, 10);
        const deleted = await db.User.destroy({ where: { userId: teacherId } });
        if (!deleted) return res.status(404).json({ message: 'Teacher/User not found.' });
        return res.json({ message: 'Teacher deleted successfully!' });
    } catch (e) {
        console.error('deleteTeacher error:', e);
        return res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

//trang giáo viên
const getTeacherCourses = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        if (!teacherId) return res.status(401).json({ error: 'Unauthorized: User not found' });

        const courses = await db.Course.findAll({
            where: { teacherId },
            attributes: ['id', 'title', 'description', 'price']
        });

        return res.status(200).json({
            message: 'Lấy danh sách khóa học thành công',
            courses
        });
    } catch (error) {
        console.error('getTeacherCourses error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const createCourse = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized: User not found' });

        const { title, description, price } = req.body;
        if (!title || !description || price == null) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin khóa học.' });
        }

        const newCourse = await db.Course.create({ title, description, price, teacherId });
        return res.status(201).json({
            message: 'Khóa học đã được tạo thành công!',
            course: newCourse
        });
    } catch (error) {
        console.error('createCourse error:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo khóa học.' });
    }
};

// Lấy danh sách lớp do giáo viên phụ trách
const getTeacherClasses = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        if (!teacherId) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        const classes = await db.Class.findAll({
            // 1) join vào bảng ClassTeachers để lọc theo teacher_id
            include: [
                {
                    model: db.ClassTeacher,
                    as: 'classTeacher',
                    where: { teacher_id: teacherId },
                    attributes: []         // không cần lấy ra bất kỳ cột nào
                },
                // 2) join lịch học
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['study_day', 'start_time', 'end_time']
                },
                // 3) join students chỉ để đếm
                {
                    model: db.Student,
                    as: 'students',
                    attributes: [],
                    through: { attributes: [] }
                }
            ],
            attributes: [
                'id',
                'className',
                'gradeLevel',
                // đếm số học sinh
                [db.sequelize.fn('COUNT', db.sequelize.col('students.id')), 'studentsCount']
            ],
            group: [
                'Class.id',
                'Class.className',
                'Class.gradeLevel',
                'classSchedule.id',
                'classSchedule.study_day',
                'classSchedule.start_time',
                'classSchedule.end_time'
            ]
        });

        // map lại format JSON
        const result = classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: parseInt(c.get('studentsCount'), 10),
            schedule: c.classSchedule  // { study_day, start_time, end_time } hoặc null
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('getTeacherClasses error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Lấy chi tiết danh sách học sinh của một lớp
const getClassStudents = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        const teacherId = req.user?.userId;
        if (!teacherId) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        // 1) Lấy lớp cùng danh sách lesson (sessions) và students cơ bản
        const cls = await db.Class.findByPk(classId, {
            include: [
                // Các buổi học
                {
                    model: db.Lesson,
                    as: 'lessons',
                    through: { attributes: [] },
                    attributes: ['id', 'lessonContent', 'lessonDate']
                },
                // Danh sách học sinh: giờ thêm cả DOB, school, parentPhoneNumber, parentEmail
                {
                    model: db.Student,
                    as: 'students',
                    through: { attributes: [] },
                    attributes: [
                        'id',
                        'fullName',
                        'DOB',
                        'school',
                        'parentPhoneNumber',
                        'parentEmail'
                    ]
                }
            ],
            order: [[{ model: db.Lesson, as: 'lessons' }, 'lessonDate', 'ASC']]
        });

        if (!cls) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Chuẩn bị mảng sessions
        const sessions = cls.lessons.map(l => ({
            id: l.id,
            date: l.lessonDate,
            content: l.lessonContent
        }));

        // 2) Với mỗi student, lần lượt lấy performance cho từng session
        const students = await Promise.all(
            cls.students.map(async s => {
                // build performance array
                const performance = await Promise.all(
                    sessions.map(async ss => {
                        const p = await db.StudentPerformance.findOne({
                            include: [
                                {
                                    model: db.Student,
                                    through: {
                                        model: db.StudentPerformanceStudent,
                                        where: { studentId: s.id }
                                    },
                                    required: true,
                                    attributes: []
                                },
                                {
                                    model: db.Lesson,
                                    through: {
                                        model: db.StudentPerformanceLesson,
                                        where: { lessonId: ss.id }
                                    },
                                    required: true,
                                    attributes: []
                                }
                            ]
                        });

                        return {
                            sessionId: ss.id,
                            doneCount: p?.doneTask ?? 0,
                            correctCount: p?.totalScore ?? 0,
                            wrongTasks: Array.isArray(p?.incorrectTasks) ? p.incorrectTasks : [],
                            missingTasks: Array.isArray(p?.missingTasks) ? p.missingTasks : [],
                            presentation: p?.presentation ?? '',
                            skills: p?.skills ?? ''
                        };
                    })
                );

                // trả về đầy đủ thông tin student + performance
                return {
                    id: s.id,
                    fullName: s.fullName,
                    DOB: s.DOB,
                    school: s.school,
                    parentPhoneNumber: s.parentPhoneNumber,
                    parentEmail: s.parentEmail,
                    performance
                };
            })
        );

        return res.json({
            id: cls.id,
            className: cls.className,
            sessions,
            students
        });
    } catch (error) {
        console.error('getClassStudents error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getTeacherInfo,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherCourses,
    createCourse,
    getTeacherClasses,
    getClassStudents
};
