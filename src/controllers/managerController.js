const bcrypt = require('bcrypt');
const db = require('../models');
const { safeStr, formatDateVN, jsonToText } = require("../utils/emailHelpers");
// Lazy-load để cold start không phải nạp nodemailer/handlebars khi request không gửi mail
const sendLessonResultEmail = (...args) => require("../services/emailService").sendLessonResultEmail(...args);
const sendQuizSubmissionEmail = (...args) => require("../services/emailService").sendQuizSubmissionEmail(...args);
const sendQuizResultEmail = (...args) => require("../services/emailService").sendQuizResultEmail(...args);

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
    const t = await db.sequelize.transaction();
    try {
        const { lessonDate, classId } = req.body;
        if (!lessonDate || !classId) {
            await t.rollback();
            return res.status(400).json({ message: 'lessonDate và classId là bắt buộc' });
        }

        const newLesson = await db.Lesson.create({
            lessonContent: '',
            totalTaskLength: '',
            lessonDate,
        }, { transaction: t });

        const newLessonClass = await db.LessonClass.create({
            lessonId: newLesson.id,
            classId
        }, { transaction: t });

        // Snapshot danh sách học sinh hiện tại của lớp vào Lesson_Students
        const studentLinks = await db.Student_Classes.findAll({
            where: { classId },
            attributes: ['studentId'],
            transaction: t
        });

        if (studentLinks.length > 0) {
            await db.LessonStudent.bulkCreate(
                studentLinks.map(s => ({
                    lessonId: newLesson.id,
                    studentId: s.studentId,
                    attendance: true
                })),
                { transaction: t }
            );
        }

        await t.commit();
        return res.status(201).json({
            message: 'Tạo mới buổi học thành công!',
            lesson: newLesson,
            lessonClass: newLessonClass
        });
    } catch (error) {
        await t.rollback();
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

        // 2) Lấy className + students từ snapshot Lesson_Students
        const cls = await db.Class.findByPk(classId, { attributes: ["id", "className"] });
        if (!cls) return res.status(404).json({ message: "Class not found" });

        const lessonStudentRows = await db.LessonStudent.findAll({ where: { lessonId } });
        const lessonStudentIds = lessonStudentRows.map(r => r.studentId);

        const students = lessonStudentIds.length > 0
            ? await db.Student.findAll({
                where: { id: { [db.Sequelize.Op.in]: lessonStudentIds } },
                attributes: ["id", "fullName", "parentEmail"]
            })
            : [];

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

        // 4) Attendance map từ lessonStudentRows đã fetch ở bước 2
        const attendanceMap = new Map(lessonStudentRows.map(r => [r.studentId, r.attendance]));

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
const QUIZ_ANSWER_KEY = {
    q1: "c",
    q2: "d",
    q3: "b",
    q4: "c",
    q5: "b",
    q6: "c",
    q7: "b",
    q8: "c",
    q9: "a",
    q10: "c",
    q11: "b",
    q12: "c",
    q13: "b",
    q14: "b",
    q15: "b",
    q16: "c",
    q17: "c",
    q18: "a",
    q19: "b",
    q20: "c",
    q21: "d",
    q22: "b",
    q23: "b",
};

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const submitQuizAnswers = async (req, res) => {
    try {
        const { fullName, contact, submittedAt, answers } = req.body || {};

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ message: "Invalid payload: answers is required." });
        }

        // 1) mail quản lý (fixed)
        const adminTo = process.env.QUIZ_TO_EMAIL;
        if (!adminTo) {
            return res.status(500).json({ message: "Missing QUIZ_TO_EMAIL in env." });
        }

        const subjectAdmin = process.env.QUIZ_SUBJECT || "[CMATH EDUCATION] Quiz nội quy - Submission";

        const submissionData = {
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

        // 2) chấm điểm trên server (answer key)
        const details = answers.map((a, idx) => {
            const qid = safeStr(a.questionId, "");
            const chosenId = safeStr(a.chosenOptionId, "");
            const correctOptionId = QUIZ_ANSWER_KEY[qid]; // undefined nếu qid sai
            const ok = Boolean(correctOptionId) && chosenId === correctOptionId;

            return {
                no: idx + 1,
                questionId: qid,
                questionText: safeStr(a.questionText, ""),
                chosenOptionId: chosenId,
                chosenOptionText: safeStr(a.chosenOptionText, ""),
                correctOptionId: correctOptionId || "?",
                isCorrect: ok,
            };
        });

        const totalCount = details.length;
        const correctCount = details.reduce((acc, d) => acc + (d.isCorrect ? 1 : 0), 0);
        const percent = totalCount ? Math.round((correctCount * 100) / totalCount) : 0;

        const wrongAnswers = details.filter((d) => !d.isCorrect);

        // 3) gửi mail cho user nếu contact là email
        const userEmail = isEmail(contact) ? contact : null;
        const subjectUser = process.env.QUIZ_RESULT_SUBJECT || "[CMATH EDUCATION] Kết quả Quiz nội quy";

        const resultData = {
            fullName: safeStr(fullName, "-"),
            submittedAt: safeStr(submittedAt, new Date().toISOString()),
            totalCount,
            correctCount,
            percent,
            hasWrong: wrongAnswers.length > 0,
            wrongAnswers,
        };

        // 4) send
        // - Luôn gửi admin
        // - Gửi user nếu có email hợp lệ
        const tasks = [
            sendQuizSubmissionEmail({ to: adminTo, subject: subjectAdmin, data: submissionData }),
        ];

        if (userEmail) {
            tasks.push(sendQuizResultEmail({ to: userEmail, subject: subjectUser, data: resultData }));
        }

        await Promise.all(tasks);

        return res.status(200).json({
            message: "Recorded",
            sentToUser: Boolean(userEmail),
        });
    } catch (error) {
        console.error("submitQuizAnswers error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const getManagerDashboardStats = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const manager = await db.Manager.findByPk(managerId, { attributes: ['gradeLevel'] });
        if (!manager) return res.status(404).json({ message: 'Manager not found' });

        const classes = await db.Class.findAll({
            where: { gradeLevel: manager.gradeLevel },
            attributes: ['id', 'className']
        });

        const empty = (classCount = 0, totalStudents = 0) => ({
            summary: { classCount, totalStudents, totalLessons: 0, overallAvgScore: null },
            classNames: classes.map(c => c.className),
            scoreData: [],
            attendanceData: []
        });

        if (classes.length === 0) return res.status(200).json(empty());

        const classIds = classes.map(c => c.id);

        const [studentCountRows] = await db.sequelize.query(
            `SELECT COUNT(DISTINCT studentId) AS total FROM Student_Classes WHERE classId IN (:classIds)`,
            { replacements: { classIds } }
        );
        const totalStudents = parseInt(studentCountRows[0]?.total) || 0;

        // Lấy tất cả buổi học của các lớp, sắp xếp mới nhất trước
        const [allLessonRows] = await db.sequelize.query(`
            SELECT lc.classId, l.id AS lessonId, l.lessonDate
            FROM Lesson_Classes lc
            JOIN Lessons l ON l.id = lc.lessonId
            WHERE lc.classId IN (:classIds)
            ORDER BY l.lessonDate DESC
        `, { replacements: { classIds } });

        // Giữ lại 2 buổi học gần nhất của mỗi lớp
        const lessonsByClass = new Map();
        for (const row of allLessonRows) {
            if (!lessonsByClass.has(row.classId)) lessonsByClass.set(row.classId, []);
            const arr = lessonsByClass.get(row.classId);
            if (arr.length < 2) arr.push(row);
        }

        const targetLessonIds = [...lessonsByClass.values()].flat().map(r => r.lessonId);
        if (targetLessonIds.length === 0) return res.status(200).json(empty(classes.length, totalStudents));

        // Điểm danh theo buổi học và lớp
        const [attendanceRows] = await db.sequelize.query(`
            SELECT ls.lessonId, lc.classId,
                COUNT(*) AS total,
                SUM(CASE WHEN ls.attendance = 1 THEN 1.0 ELSE 0 END) AS present
            FROM Lesson_Students ls
            JOIN Lesson_Classes lc ON lc.lessonId = ls.lessonId
            WHERE ls.lessonId IN (:lessonIds) AND lc.classId IN (:classIds)
            GROUP BY ls.lessonId, lc.classId
        `, { replacements: { lessonIds: targetLessonIds, classIds } });

        // Điểm trung bình theo buổi học và lớp
        const [scoreRows] = await db.sequelize.query(`
            SELECT spl.lessonId, lc.classId,
                AVG(CAST(sp.totalScore AS FLOAT)) AS avgScore
            FROM StudentPerformance_Lessons spl
            JOIN StudentPerformances sp ON sp.id = spl.studentPerformanceId
            JOIN Lesson_Classes lc ON lc.lessonId = spl.lessonId
            WHERE spl.lessonId IN (:lessonIds) AND lc.classId IN (:classIds)
            GROUP BY spl.lessonId, lc.classId
        `, { replacements: { lessonIds: targetLessonIds, classIds } });

        const attendanceMap = new Map(
            attendanceRows.map(r => [`${r.classId}_${r.lessonId}`,
                r.total > 0 ? Math.round((r.present / r.total) * 100) : null
            ])
        );
        const scoreMap = new Map(
            scoreRows.map(r => [`${r.classId}_${r.lessonId}`,
                r.avgScore != null ? Math.round(parseFloat(r.avgScore) * 10) / 10 : null
            ])
        );

        // Tính ISO week và nhãn "dd/MM" (thứ Hai của tuần)
        const getWeekKey = (dateStr) => {
            const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
            const [y, m, d] = s.substring(0, 10).split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const thu = new Date(date);
            thu.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(thu.getFullYear(), 0, 4);
            const weekNum = 1 + Math.round(((thu.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
            const monday = new Date(date);
            monday.setDate(date.getDate() - (date.getDay() + 6) % 7);
            const label = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
            return { key: `${thu.getFullYear()}-${weekNum}`, label };
        };

        // Gán mỗi lessonId vào tuần tương ứng
        const lessonWeekMap = new Map();
        const weekLabelMap = new Map();
        for (const rows of lessonsByClass.values()) {
            for (const r of rows) {
                const { key, label } = getWeekKey(r.lessonDate);
                lessonWeekMap.set(r.lessonId, key);
                if (!weekLabelMap.has(key)) weekLabelMap.set(key, label);
            }
        }

        // Lấy 2 tuần gần nhất
        const last2WeekKeys = [...weekLabelMap.keys()].sort().slice(-2);

        const buildChartData = (dataMap) =>
            last2WeekKeys.map(weekKey => {
                const obj = { week: weekLabelMap.get(weekKey) };
                for (const cls of classes) {
                    const lesson = (lessonsByClass.get(cls.id) || [])
                        .find(l => lessonWeekMap.get(l.lessonId) === weekKey);
                    obj[cls.className] = lesson
                        ? (dataMap.get(`${cls.id}_${lesson.lessonId}`) ?? null)
                        : null;
                }
                return obj;
            });

        const allScores = scoreRows.map(r => parseFloat(r.avgScore)).filter(v => !isNaN(v));
        const overallAvgScore = allScores.length > 0
            ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10) / 10
            : null;

        return res.status(200).json({
            summary: { classCount: classes.length, totalStudents, totalLessons: targetLessonIds.length, overallAvgScore },
            classNames: classes.map(c => c.className),
            scoreData: buildChartData(scoreMap),
            attendanceData: buildChartData(attendanceMap)
        });
    } catch (error) {
        console.error('getManagerDashboardStats error:', error);
        return res.status(500).json({ message: 'Error fetching dashboard stats' });
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
    submitQuizAnswers,
    getManagerDashboardStats
};
