const bcrypt = require('bcryptjs');
const db = require('../models');
const { safeStr, formatDateVN, jsonToText } = require("../utils/emailHelpers");
const { sendLessonResultEmail, sendQuizSubmissionEmail } = require("../services/emailService");

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

//Điểm danh
const updateStudentAttendance = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const studentId = parseInt(req.params.studentId, 10);
        const { attendance } = req.body; // true/false

        // Dùng upsert giống như bên assistant để đảm bảo dữ liệu được cập nhật hoặc tạo mới
        await db.LessonStudent.upsert({
            lessonId: lessonId,
            studentId: studentId,
            attendance: attendance
        });

        return res.status(200).json({ message: 'Cập nhật điểm danh thành công' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật điểm danh' });
    }
};

//Lấy thông tin buổi học
const getLessonDetail = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const classId = parseInt(req.params.classId, 10); // Lấy classId từ URL

        // 1. Lấy thông tin lớp học (để lấy className - VD: 9D0A)
        const classInfo = await db.Class.findByPk(classId, {
            attributes: ['className'] // Chỉ cần lấy tên lớp
        });

        // 2. Lấy thông tin buổi học HIỆN TẠI
        const currentLesson = await db.Lesson.findByPk(lessonId);

        if (!currentLesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // 3. Tìm buổi học TRƯỚC ĐÓ của lớp này (để lấy nội dung và số bài tập cũ)
        // Query này dựa trên logic: Cùng classId, ngày học nhỏ hơn ngày hiện tại, lấy ngày gần nhất
        const previousLesson = await db.Lesson.findOne({
            include: [{
                model: db.Class,
                where: { id: classId }, // Quan trọng: Phải thuộc lớp này
                attributes: [],
                through: { attributes: [] }
            }],
            where: {
                lessonDate: {
                    [db.Sequelize.Op.lt]: currentLesson.lessonDate // Ngày nhỏ hơn ngày hiện tại
                }
            },
            order: [['lessonDate', 'DESC']], // Lấy bài mới nhất trong quá khứ
        });

        // 4. Chuẩn bị dữ liệu buổi trước
        const prevData = previousLesson ? {
            content: previousLesson.lessonContent,
            homeworkCount: previousLesson.totalTaskLength
        } : {
            content: 'Không có buổi học trước',
            homeworkCount: 0
        };

        // 5. Trả về kết quả gộp
        return res.status(200).json({
            id: currentLesson.id,
            className: classInfo ? classInfo.className : `Lớp ${classId}`, // <--- TRẢ VỀ TÊN LỚP TẠI ĐÂY
            lessonContent: currentLesson.lessonContent,
            lessonDate: currentLesson.lessonDate,
            totalTaskLength: currentLesson.totalTaskLength,
            isLocked: Boolean(currentLesson.isLocked),

            // Thông tin buổi trước
            previousLessonContent: prevData.content,
            previousHomeworkCount: prevData.homeworkCount
        });

    } catch (error) {
        console.error('getLessonDetail error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

//Chốt kết quả buổi học
const toggleLessonLock = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const lesson = await db.Lesson.findByPk(lessonId);

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // Đảo ngược trạng thái hiện tại (True -> False, False -> True)
        const newStatus = !lesson.isLocked;

        await lesson.update({ isLocked: newStatus });

        return res.status(200).json({
            message: newStatus ? 'Đã chốt kết quả buổi học' : 'Đã mở khóa buổi học',
            isLocked: newStatus
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// POST /manager/classes/:classId/lessons/:lessonId/send-results-emails
const sendLessonResultsEmails = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId, 10);
        const lessonId = parseInt(req.params.lessonId, 10);

        // 1) Lấy lesson + check locked
        const lesson = await db.Lesson.findByPk(lessonId);
        if (!lesson) return res.status(404).json({ message: "Lesson not found" });

        if (!lesson.isLocked) {
            return res.status(400).json({
                message: "Buổi học chưa chốt (isLocked=false), không thể gửi email.",
            });
        }

        // 2) Lấy className + students (reuse logic getClassStudents)
        const cls = await db.Class.findByPk(classId, {
            attributes: ["id", "className"],
            include: [{
                model: db.Student,
                as: "students",
                attributes: ["id", "fullName", "parentEmail"],
                through: { attributes: [] }
            }]
        });

        if (!cls) return res.status(404).json({ message: "Class not found" });

        const students = cls.students || [];

        // 3) Lấy previous lesson của class (reuse logic getLessonDetail)
        const previousLesson = await db.Lesson.findOne({
            include: [{
                model: db.Class,
                where: { id: classId },
                attributes: [],
                through: { attributes: [] }
            }],
            where: {
                lessonDate: { [db.Sequelize.Op.lt]: lesson.lessonDate }
            },
            order: [["lessonDate", "DESC"]],
        });

        const previousLessonContent = previousLesson?.lessonContent || "Không có buổi học trước";
        const previousHomeworkCount = previousLesson?.totalTaskLength ?? 0;

        // 4) Attendance map từ LessonStudent
        const attendanceRows = await db.LessonStudent.findAll({
            where: { lessonId },
            attributes: ["studentId", "attendance"]
        });
        const attendanceMap = new Map(attendanceRows.map(r => [r.studentId, r.attendance]));

        // 5) Performance rows cho lessonId: dùng SQL raw để không phụ thuộc association
        const [perfRows] = await db.sequelize.query(
            `
  SELECT
    sp.id,
    sp.doneTask,
    sp.totalScore,
    sp.incorrectTasks,
    sp.missingTasks,
    sp.presentation,
    sp.skills,
    sp.comment,
    sps.studentId
  FROM StudentPerformances sp
  INNER JOIN StudentPerformance_Lessons spl
    ON spl.studentPerformanceId = sp.id
  INNER JOIN StudentPerformance_Students sps
    ON sps.studentPerformanceId = sp.id
  WHERE spl.lessonId = :lessonId
  ORDER BY sp.id DESC
  `,
            { replacements: { lessonId } }
        );

        // Map performance mới nhất theo studentId
        const perfByStudentId = new Map();
        for (const row of perfRows) {
            if (!perfByStudentId.has(row.studentId)) {
                perfByStudentId.set(row.studentId, row); // do ORDER BY id DESC
            }
        }

        // 6) Send mails
        const subject = "[CMATH EDUCATION] ĐÁNH GIÁ KẾT QUẢ HỌC TẬP";

        let sent = 0, failed = 0, skippedNoEmail = 0;
        const errors = [];

        for (const s of students) {
            const to = s.parentEmail;
            if (!to) { skippedNoEmail++; continue; }

            const perf = perfByStudentId.get(s.id) || null;
            const attendance = attendanceMap.has(s.id) ? attendanceMap.get(s.id) : true;

            const data = {
                mail: to,
                name: safeStr(s.fullName, "-"),
                day: formatDateVN(lesson.lessonDate),
                class: safeStr(cls.className, `Lớp ${classId}`),
                content: safeStr(lesson.lessonContent, "Chưa cập nhật"),
                comment: safeStr(perf?.comment, "-"),

                previousContent: safeStr(previousLessonContent, "-"),
                totalTaskLength: safeStr(lesson.totalTaskLength ?? 0, "0"),
                doneTask: safeStr(perf?.doneTask, "N/A"),
                totalScore: safeStr(perf?.totalScore, "N/A"),
                inCorrectTasks: jsonToText(perf?.incorrectTasks),
                missingTasks: jsonToText(perf?.missingTasks),
                presentation: safeStr(perf?.presentation, "-"),
                skills: safeStr(perf?.skills, "-"),

                // nếu bạn muốn add vào hbs:
                // attendance: attendance ? "Có mặt" : "Vắng"
            };

            try {
                await sendLessonResultEmail({ to, subject, data });
                sent++;
            } catch (e) {
                failed++;
                errors.push({ studentId: s.id, email: to, error: e.message });
            }
        }

        return res.status(200).json({
            message: "Đã xử lý gửi email kết quả buổi học.",
            stats: { sent, failed, skippedNoEmail },
            errors,
        });
    } catch (error) {
        console.error("sendLessonResultsEmails error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

//trợ giảng test nội quy
const submitQuizAnswers = async (req, res) => {
    try {
        const { fullName, contact, submittedAt, answers } = req.body || {};

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ message: "Invalid payload: answers is required." });
        }

        const to = process.env.QUIZ_TO_EMAIL; // email cố định nhận bài
        if (!to) {
            return res.status(500).json({ message: "Missing QUIZ_TO_EMAIL in env." });
        }

        const subject = process.env.QUIZ_SUBJECT || "[CMATH EDUCATION] Quiz nội quy - Submission";

        const data = {
            fullName: safeStr(fullName, "-"),
            contact: safeStr(contact, "-"),
            submittedAt: safeStr(submittedAt, new Date().toISOString()),
            answers: answers.map((a, idx) => ({
                no: idx + 1,
                questionText: safeStr(a.questionText, ""),
                chosenOptionId: safeStr(a.chosenOptionId, ""),
                chosenOptionText: safeStr(a.chosenOptionText, ""),
            })),
        };

        await sendQuizSubmissionEmail({ to, subject, data });

        // Không trả kết quả đúng/sai. Chỉ báo ghi nhận.
        return res.status(200).json({ message: "Recorded" });
    } catch (error) {
        console.error("submitQuizAnswers error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

module.exports = {
    getManagerInfo,
    createManager,
    updateManager,
    deleteManager,
    getManagerClasses,
    createLesson,
    getClassStudents,
    updateStudentAttendance,
    getLessonDetail,
    toggleLessonLock,
    sendLessonResultsEmails,
    submitQuizAnswers
};
