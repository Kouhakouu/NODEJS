const bcrypt = require('bcrypt');
import db from '../models/index';
import CRUDservice from '../services/CRUDservice';
import { getClassCounts } from '../utils/classCounts';
// Lazy-load để cold start không phải nạp SDK AI / nodemailer khi request không dùng đến
const aiService = {
    generateComment: (...args) => require('../services/aiService').generateComment(...args)
};
const sendAssistantCodeEmail = (...args) => require('../services/emailService').sendAssistantCodeEmail(...args);

const isValidEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const getManagerGradeLevel = async (managerId) => {
    const manager = await db.Manager.findByPk(managerId, { attributes: ['gradeLevel'] });
    if (!manager) {
        const error = new Error('Manager not found.');
        error.statusCode = 404;
        throw error;
    }
    return manager.gradeLevel;
};

const ensureManagerCanManageClass = async (req, classId) => {
    if (req.user?.role !== 'MANAGER') return;

    const gradeLevel = await getManagerGradeLevel(req.user.userId);
    const classroom = await db.Class.findOne({
        where: { id: classId, gradeLevel },
        attributes: ['id']
    });

    if (!classroom) {
        const error = new Error('Bạn chỉ có thể phân công trợ giảng cho lớp thuộc khối mình quản lý.');
        error.statusCode = 403;
        throw error;
    }
};

const sendControllerError = (res, error, fallbackMessage) => {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || fallbackMessage });
};

// Đáp án chuẩn bài test nội quy trợ giảng (đồng bộ với REACTJS/src/app/quiz/page.tsx).
// Chấm ở server để không bypass được bằng cách gọi thẳng API.
const QUIZ_ANSWER_KEY = {
    q1: 'c', q2: 'd', q3: 'b', q4: 'c', q5: 'b', q6: 'c', q7: 'b', q8: 'c',
    q9: 'a', q10: 'c', q11: 'b', q12: 'c', q13: 'b', q14: 'b', q15: 'b',
    q16: 'c', q17: 'c', q18: 'a', q19: 'b', q20: 'b', q21: 'd', q22: 'c',
    q23: 'c', q24: 'c', q25: 'b'
};
// Số câu đúng tối thiểu để được cấp mã kích hoạt
const QUIZ_PASS_THRESHOLD = 20;

// Đếm số câu trả lời đúng từ answers gửi lên ({ q1: 'c', q2: 'd', ... })
const scoreQuiz = (answers) => {
    if (!answers || typeof answers !== 'object') return 0;
    let correct = 0;
    for (const [questionId, correctOptionId] of Object.entries(QUIZ_ANSWER_KEY)) {
        if (answers[questionId] === correctOptionId) correct += 1;
    }
    return correct;
};

// Trang admin: lấy thông tin trợ giảng kèm lớp
const getAssistantInfo = async (req, res) => {
    try {
        const assistants = await db.Assistant.findAll({
            attributes: ['userId', 'fullName', 'phoneNumber'],
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['email']
                },
                {
                    model: db.Class,
                    as: 'classes',
                    attributes: ['id', 'className', 'gradeLevel'],
                    through: { attributes: [] }
                }
            ]
        });

        const result = assistants.map(a => ({
            userId: a.userId,
            fullName: a.fullName,
            phoneNumber: a.phoneNumber,
            email: a.user?.email || null,
            classes: a.classes || []
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('getAssistantInfo error:', error);
        return sendControllerError(res, error, 'Error fetching assistant data.');
    }
};

const createAssistant = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await db.User.create({ email, password: hashed, roleId: 4 });
        const assistant = await db.Assistant.create({
            userId: user.userId,
            fullName,
            phoneNumber
        });

        return res.status(201).json({
            message: 'Tạo trợ giảng thành công!',
            assistant: {
                userId: assistant.userId,
                fullName: assistant.fullName,
                phoneNumber: assistant.phoneNumber,
                email: user.email
            }
        });
    } catch (error) {
        console.error('createAssistant error:', error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

const postClassAssistantCRUD = async (req, res) => {
    const { classId, assistantId } = req.body;
    if (!classId || !assistantId) {
        return res.status(400).json({ message: 'Class ID and Assistant ID are required.' });
    }
    try {
        await ensureManagerCanManageClass(req, classId);
        let result = await CRUDservice.createClassAssistant({ classId, assistantId });
        return res.status(200).json({ message: result });
    } catch (e) {
        console.error(e);
        return sendControllerError(res, e, 'Error assigning class to assistant.');
    }
};

const postDeleteClassAssistantCRUD = async (req, res) => {
    const { classId, assistantId } = req.body;
    if (!classId || !assistantId) {
        return res.status(400).json({ message: 'Class ID and Assistant ID are required.' });
    }
    try {
        await ensureManagerCanManageClass(req, classId);
        let result = await CRUDservice.deleteClassAssistant({ classId, assistantId });
        return res.status(200).json({ message: result });
    } catch (e) {
        console.error(e);
        return sendControllerError(res, e, 'Error removing class from assistant.');
    }
};

let postAssistantDeleteCRUD = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Assistant ID is required.' });
    }

    try {
        await CRUDservice.deleteAssistant(id);
        return res.status(200).json({ message: 'Assistant deleted successfully!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: e.message || 'Error deleting assistant.' });
    }
};

let updateAssistant = async (req, res) => {
    let assistantId = req.params.id;
    let data = req.body;

    if (!assistantId) {
        return res.status(400).json({ message: 'Assistant ID is required.' });
    }

    try {
        let updatedAssistant = await CRUDservice.updateAssistantData(assistantId, data);
        return res.status(200).json(updatedAssistant);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: e.message || 'Error updating assistant.' });
    }
};

// ===== Kích hoạt tài khoản trợ giảng (làm test -> nhận mã qua email -> nhập mã) =====

// Bước 1: trợ giảng làm xong bài test, gửi mã 6 số về email tuỳ chọn
const requestVerificationCode = async (req, res) => {
    try {
        if (req.user.role !== 'ASSISTANT') {
            return res.status(403).json({ message: 'Chỉ trợ giảng mới có thể thực hiện thao tác này.' });
        }

        const { email, answers } = req.body;
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Vui lòng nhập email hợp lệ để nhận mã.' });
        }

        const assistant = await db.Assistant.findByPk(req.user.userId);
        if (!assistant) {
            return res.status(404).json({ message: 'Không tìm thấy trợ giảng.' });
        }
        if (assistant.status === 1) {
            return res.status(400).json({ message: 'Tài khoản đã được kích hoạt, không cần nhập mã.' });
        }

        // Chấm bài test: phải đúng tối thiểu QUIZ_PASS_THRESHOLD câu mới được cấp mã
        const totalQuestions = Object.keys(QUIZ_ANSWER_KEY).length;
        const correctCount = scoreQuiz(answers);
        if (correctCount < QUIZ_PASS_THRESHOLD) {
            return res.status(400).json({
                message: `Bạn mới trả lời đúng ${correctCount}/${totalQuestions} câu. Cần đúng tối thiểu ${QUIZ_PASS_THRESHOLD} câu để nhận mã kích hoạt. Vui lòng xem lại và làm lại bài test.`,
                correctCount,
                totalQuestions,
                passThreshold: QUIZ_PASS_THRESHOLD,
                passed: false
            });
        }

        // Sinh mã 6 chữ số, lưu lại để đối chiếu
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await assistant.update({ verifyCode: code });

        await sendAssistantCodeEmail({
            to: email,
            subject: process.env.ASSISTANT_CODE_SUBJECT || '[CMATH EDUCATION] Mã kích hoạt tài khoản trợ giảng',
            data: { fullName: assistant.fullName, code },
        });

        return res.status(200).json({ message: 'Đã gửi mã xác thực về email của bạn.' });
    } catch (error) {
        console.error('requestVerificationCode error:', error);
        return res.status(500).json({ message: error.message || 'Lỗi khi gửi mã xác thực.' });
    }
};

// Bước 2: trợ giảng nhập mã, đúng thì status = 1 -> được dùng web
const verifyAssistantCode = async (req, res) => {
    try {
        if (req.user.role !== 'ASSISTANT') {
            return res.status(403).json({ message: 'Chỉ trợ giảng mới có thể thực hiện thao tác này.' });
        }

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Vui lòng nhập mã xác thực.' });
        }

        const assistant = await db.Assistant.findByPk(req.user.userId);
        if (!assistant) {
            return res.status(404).json({ message: 'Không tìm thấy trợ giảng.' });
        }
        if (assistant.status === 1) {
            return res.status(200).json({ message: 'Tài khoản đã được kích hoạt.', status: 1 });
        }
        if (!assistant.verifyCode || String(code).trim() !== assistant.verifyCode) {
            return res.status(400).json({ message: 'Mã xác thực không đúng. Vui lòng kiểm tra lại email.' });
        }

        await assistant.update({ status: 1, verifyCode: null });

        return res.status(200).json({ message: 'Kích hoạt tài khoản thành công!', status: 1 });
    } catch (error) {
        console.error('verifyAssistantCode error:', error);
        return res.status(500).json({ message: error.message || 'Lỗi khi xác thực mã.' });
    }
};

//trang trợ giảng
const getAssistantClasses = async (req, res) => {
    try {
        const assistantId = req.user.userId;

        // Tìm trợ giảng & lấy kèm các lớp + lịch.
        // Sĩ số / số buổi đếm riêng bằng getClassCounts để tránh join tích Descartes.
        const assistant = await db.Assistant.findByPk(assistantId, {
            include: [{
                model: db.Class,
                as: 'classes',
                attributes: ['id', 'className', 'gradeLevel'],
                through: { attributes: [] },
                include: [{
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['study_day', 'start_time', 'end_time']
                }]
            }]
        });

        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }

        const { studentCounts, lessonCounts } = await getClassCounts(assistant.classes.map(c => c.id));

        // Chuyển lớp về dạng gọn gửi cho FE
        const result = assistant.classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: studentCounts.get(c.id) ?? 0,
            assignmentsCount: lessonCounts.get(c.id) ?? 0,
            schedule: c.classSchedule           // null nếu chưa có
                ? {
                    study_day: c.classSchedule.study_day,
                    start_time: c.classSchedule.start_time,
                    end_time: c.classSchedule.end_time
                }
                : null
        }));

        return res.status(200).json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching assistant classes' });
    }
};

const getClassStudentDetail = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        console.log("Fetching class details for ID:", classId);

        const classDetail = await db.Class.findByPk(classId, {
            include: [
                {
                    model: db.Student,
                    as: 'students',
                    attributes: ['id', 'fullName', 'DOB', 'school', 'parentPhoneNumber', 'parentEmail'],
                    required: false, // returns the class even if there are no students
                    through: { attributes: [] }
                },
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['study_day', 'start_time', 'end_time'],
                    required: false
                }
            ]
        });


        if (!classDetail) {
            console.log("⚠️ Class not found:", classId);
            return res.status(404).json({ message: 'Class not found' });
        }

        // Nếu students là null, gán thành một mảng rỗng để tránh lỗi `.map()`
        const response = {
            ...classDetail.toJSON(),
            students: classDetail.students || []
        };

        console.log("✅ Class details retrieved:", response);
        return res.status(200).json(response);
    } catch (e) {
        console.error("❌ Error fetching class details:", e);
        return res.status(500).json({ message: 'Error fetching class details' });
    }
};

const getAssistantLessons = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        console.log(req.params.id)
        let classroom = await db.Class.findByPk(classId, {
            include: [
                {
                    model: db.Lesson,
                    as: 'lessons',
                    attributes: ['id', 'lessonContent', 'totalTaskLength', 'lessonDate', 'isLocked'],
                }
            ]
        });

        if (!classroom) {
            return res.status(404).json({ message: 'Class not found' });
        }
        return res.status(200).json(classroom.lessons);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching lessons' });
    }
};

const getLessonStudentsPerformance = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        const lessonId = parseInt(req.params.lessonId, 10);

        // Lấy danh sách học sinh từ snapshot trong Lesson_Students (tại thời điểm tạo buổi học)
        const lessonStudentRows = await db.LessonStudent.findAll({
            where: { lessonId }
        });

        if (lessonStudentRows.length === 0) {
            return res.status(200).json([]);
        }

        const studentIds = lessonStudentRows.map(ls => ls.studentId);

        // Map attendance theo studentId
        const lessonStudentMap = {};
        lessonStudentRows.forEach(ls => {
            lessonStudentMap[ls.studentId] = ls;
        });

        // Thông tin học sinh + StudentPerformance: 2 query độc lập, chạy song song
        const [students, performances] = await Promise.all([
            db.Student.findAll({
                where: { id: { [db.Sequelize.Op.in]: studentIds } },
                attributes: ['id', 'fullName', 'school', 'parentPhoneNumber', 'parentEmail']
            }),
            db.StudentPerformance.findAll({
                include: [
                    {
                        model: db.Lesson,
                        where: { id: lessonId },
                        attributes: [],
                        through: { attributes: [] }
                    },
                    {
                        model: db.Student,
                        where: { id: { [db.Sequelize.Op.in]: studentIds } },
                        attributes: ['id'],
                        through: { attributes: [] }
                    }
                ]
            })
        ]);

        const performanceMap = {};
        performances.forEach(perf => {
            if (perf.Students && perf.Students.length > 0) {
                const studentId = perf.Students[0].id;
                if (!performanceMap[studentId]) {
                    performanceMap[studentId] = perf.toJSON();
                }
            }
        });

        const studentsWithPerformance = students.map(student => {
            const perf = performanceMap[student.id] || null;
            const ls = lessonStudentMap[student.id] || null;
            return {
                id: student.id,
                fullName: student.fullName,
                school: student.school,
                parentPhoneNumber: student.parentPhoneNumber,
                parentEmail: student.parentEmail,
                attendance: ls ? ls.attendance : false,
                performance: perf ? {
                    doneTask: perf.doneTask,
                    totalScore: perf.totalScore,
                    incorrectTasks: perf.incorrectTasks,
                    missingTasks: perf.missingTasks,
                    presentation: perf.presentation,
                    skills: perf.skills,
                    comment: perf.comment
                } : null
            };
        });

        return res.status(200).json(studentsWithPerformance);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching students performance' });
    }
};

const postSaveStudentPerformance = async (req, res) => {
    const { studentId, lessonId, performance } = req.body;

    // Validate input trước, rồi mới query DB
    if (!studentId || !lessonId || !performance) {
        return res.status(400).json({ message: 'Student ID, Lesson ID và dữ liệu performance là bắt buộc.' });
    }

    const checkLesson = await db.Lesson.findByPk(lessonId, { attributes: ['id', 'isLocked'] });
    if (checkLesson && checkLesson.isLocked) {
        return res.status(403).json({ message: 'Buổi học đã bị chốt kết quả, không thể chỉnh sửa điểm số!' });
    }
    const { doneTask, totalScore, incorrectTasks, missingTasks, presentation, skills, comment } = performance;

    const formattedIncorrectTasks = Array.isArray(incorrectTasks) ? incorrectTasks.join("; ") : incorrectTasks;
    const formattedMissingTasks = Array.isArray(missingTasks) ? missingTasks.join("; ") : missingTasks;

    const t = await db.sequelize.transaction();

    try {
        const existingPerformance = await db.StudentPerformance.findOne({
            include: [
                {
                    model: db.Student,
                    where: { id: studentId },
                    through: { attributes: [] }
                },
                {
                    model: db.Lesson,
                    where: { id: lessonId },
                    through: { attributes: [] }
                }
            ],
            transaction: t
        });

        let performanceRecord;
        if (existingPerformance) {
            // Nếu đã tồn tại, cập nhật dữ liệu performance.
            performanceRecord = await existingPerformance.update({
                doneTask,
                totalScore,
                incorrectTasks: formattedIncorrectTasks,
                missingTasks: formattedMissingTasks,
                presentation,
                skills,
                comment
            }, { transaction: t });
        } else {
            // Nếu chưa tồn tại, tạo mới bản ghi StudentPerformance
            performanceRecord = await db.StudentPerformance.create({
                doneTask,
                totalScore,
                incorrectTasks: formattedIncorrectTasks,
                missingTasks: formattedMissingTasks,
                presentation,
                skills,
                comment
            }, { transaction: t });

            await db.StudentPerformanceLesson.create({
                studentPerformanceId: performanceRecord.id,
                lessonId
            }, { transaction: t });

            await db.StudentPerformanceStudent.create({
                studentPerformanceId: performanceRecord.id,
                studentId
            }, { transaction: t });
        }

        await t.commit();
        return res.status(200).json({ message: 'Lưu kết quả học tập thành công!', studentPerformance: performanceRecord });
    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.status(500).json({ message: error.message || 'Lỗi khi lưu kết quả học tập.' });
    }
};

const getLessonHomeworkList = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const lesson = await db.Lesson.findByPk(lessonId, {
            attributes: ['id', 'homeworkList']
        });
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        return res.status(200).json({ homeworkList: lesson.homeworkList });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching homework list for the lesson' });
    }
};

const updateLessonHomeworkList = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);

        const lesson = await db.Lesson.findByPk(lessonId);
        if (lesson && lesson.isLocked) {
            return res.status(403).json({ message: 'Buổi học đã bị chốt, không thể thay đổi danh sách bài tập!' });
        }

        const { homeworkList } = req.body;
        if (typeof homeworkList !== "string") {
            return res.status(400).json({ message: 'Homework list must be provided as a string.' });
        }

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        // Nếu lesson đã có danh sách bài tập thì cập nhật (thay thế hoàn toàn)
        lesson.homeworkList = homeworkList;
        await lesson.save();

        return res.status(200).json({
            message: 'Homework list updated successfully',
            homeworkList: lesson.homeworkList
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error updating homework list for the lesson' });
    }
};

const updateLessonContent = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId, 10);
        const lessonId = parseInt(req.params.lessonId, 10);

        const lesson = await db.Lesson.findByPk(lessonId);
        if (lesson && lesson.isLocked) {
            return res.status(403).json({ message: 'Buổi học đã bị chốt, không thể thay đổi nội dung buổi học!' });
        }

        const { lessonContent } = req.body;

        if (!lessonContent || lessonContent.trim() === '') {
            return res.status(400).json({ message: 'Nội dung buổi học không được để trống.' });
        }

        // Kiểm tra buổi học có tồn tại
        if (!lesson) {
            return res.status(404).json({ message: 'Buổi học không tồn tại.' });
        }

        // (Tùy chọn) Kiểm tra buổi học có thuộc lớp đó không
        const isInClass = await db.LessonClass.findOne({
            where: { lessonId, classId }
        });
        if (!isInClass) {
            return res.status(400).json({ message: 'Buổi học này không thuộc lớp hiện tại.' });
        }

        // Cập nhật nội dung và lưu
        lesson.lessonContent = lessonContent;
        await lesson.save();

        return res.status(200).json({
            message: 'Cập nhật nội dung buổi học thành công!',
            lesson: {
                id: lesson.id,
                lessonContent: lesson.lessonContent,
                lessonDate: lesson.lessonDate,
                totalTaskLength: lesson.totalTaskLength
            }
        });
    } catch (error) {
        console.error('updateLessonContent error:', error);
        return res.status(500).json({ message: 'Lỗi khi cập nhật nội dung buổi học.' });
    }
};

const getLessonInfo = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId, 10);
        const lessonId = parseInt(req.params.lessonId, 10);

        // (Tùy chọn) Kiểm tra buổi học có thực sự thuộc lớp không
        const mapping = await db.LessonClass.findOne({
            where: { classId, lessonId }
        });
        if (!mapping) {
            return res.status(404).json({ message: 'Buổi học không thuộc lớp này.' });
        }

        // Lấy thông tin buổi học
        const lesson = await db.Lesson.findByPk(lessonId, {
            attributes: ['id', 'lessonDate', 'lessonContent', 'totalTaskLength', 'homeworkList', 'isLocked']
        });

        if (!lesson) {
            return res.status(404).json({ message: 'Không tìm thấy buổi học.' });
        }

        return res.status(200).json(lesson);
    } catch (error) {
        console.error('getLessonInfo error:', error);
        return res.status(500).json({ message: 'Lỗi khi lấy thông tin buổi học.' });
    }
};

const updateStudentAttendance = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const studentId = parseInt(req.params.studentId, 10);

        const lesson = await db.Lesson.findByPk(lessonId);
        if (lesson && lesson.isLocked) {
            return res.status(403).json({ message: 'Buổi học đã bị chốt, không thể thay đổi trạng thái điểm danh!' });
        }

        const { attendance } = req.body; // Giá trị boolean gửi từ frontend

        // Sử dụng upsert để: Cập nhật nếu đã có dòng này, Tạo mới nếu chưa có
        await db.LessonStudent.upsert({
            lessonId: lessonId,
            studentId: studentId,
            attendance: attendance
        });

        return res.status(200).json({ message: 'Cập nhật điểm danh thành công' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Lỗi khi cập nhật điểm danh' });
    }
};

const updateHomeworkList = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await db.Lesson.findByPk(id);
        if (lesson && lesson.isLocked) {
            return res.status(403).json({ message: 'Buổi học đã bị chốt, không thể thay đổi danh sách bài tập!' });
        }

        const { homeworkList } = req.body;
        const tasks = homeworkList ? homeworkList.split(',').filter(item => item.trim() !== '') : [];
        const calculatedLength = tasks.length;

        // Cập nhật vào Database
        await db.Lesson.update(
            {
                homeworkList: homeworkList,
                totalTaskLength: calculatedLength // Tự động cập nhật số lượng
            },
            { where: { id } }
        );

        return res.status(200).json({
            message: 'Cập nhật thành công',
            totalTaskLength: calculatedLength
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const generateAiCommentForStudent = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const studentId = parseInt(req.params.studentId, 10);

        const lesson = await db.Lesson.findByPk(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Buổi học không tồn tại' });
        }
        if (lesson.isLocked) {
            return res.status(403).json({ message: 'Buổi học đã bị chốt, không thể chỉnh sửa nhận xét.' });
        }

        const student = await db.Student.findByPk(studentId, { attributes: ['id', 'fullName'] });
        if (!student) {
            return res.status(404).json({ message: 'Học sinh không tồn tại' });
        }

        const performance = await db.StudentPerformance.findOne({
            include: [
                { model: db.Student, where: { id: studentId }, through: { attributes: [] } },
                { model: db.Lesson, where: { id: lessonId }, through: { attributes: [] } }
            ]
        });
        if (!performance) {
            return res.status(404).json({ message: 'Học sinh này chưa có dữ liệu chấm bài cho buổi học, hãy ấn Submit trước.' });
        }

        const lessonStudent = await db.LessonStudent.findOne({ where: { lessonId, studentId } });

        const comment = await aiService.generateComment({
            totalTaskLength: lesson.totalTaskLength,
            doneTask: performance.doneTask,
            totalScore: performance.totalScore,
            incorrectTasks: performance.incorrectTasks,
            missingTasks: performance.missingTasks,
            presentation: performance.presentation,
            skills: performance.skills,
            attendance: lessonStudent ? lessonStudent.attendance : false
        });

        await performance.update({ comment });

        return res.status(200).json({
            message: 'Đã tạo nhận xét AI thành công',
            studentId,
            comment
        });
    } catch (error) {
        console.error('generateAiCommentForStudent error:', error);
        return res.status(500).json({ message: error.message || 'Lỗi khi tạo nhận xét AI' });
    }
};

const generateAiCommentStateless = async (req, res) => {
    try {
        const {
            totalTaskLength,
            doneTask,
            totalScore,
            incorrectTasks,
            missingTasks,
            presentation,
            skills,
            attendance
        } = req.body || {};

        const comment = await aiService.generateComment({
            totalTaskLength: totalTaskLength || 0,
            doneTask: doneTask || 0,
            totalScore: totalScore || 0,
            incorrectTasks: incorrectTasks || '',
            missingTasks: missingTasks || '',
            presentation: presentation || '',
            skills: skills || '',
            attendance: attendance !== false
        });

        return res.status(200).json({ comment });
    } catch (error) {
        console.error('generateAiCommentStateless error:', error);
        return res.status(500).json({ message: error.message || 'Lỗi khi tạo nhận xét AI' });
    }
};

const generateAiCommentForLesson = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);

        const lesson = await db.Lesson.findByPk(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Buổi học không tồn tại' });
        }
        if (lesson.isLocked) {
            return res.status(403).json({ message: 'Buổi học đã bị chốt, không thể chỉnh sửa nhận xét.' });
        }

        const performances = await db.StudentPerformance.findAll({
            include: [
                { model: db.Lesson, where: { id: lessonId }, through: { attributes: [] } },
                { model: db.Student, attributes: ['id', 'fullName'], through: { attributes: [] } }
            ]
        });

        const isGraded = (p) => {
            const hasIncorrect = Array.isArray(p.incorrectTasks)
                ? p.incorrectTasks.length > 0
                : (p.incorrectTasks && String(p.incorrectTasks).trim() !== '');
            const hasMissing = Array.isArray(p.missingTasks)
                ? p.missingTasks.length > 0
                : (p.missingTasks && String(p.missingTasks).trim() !== '');
            return p.doneTask > 0 || p.totalScore > 0 || hasIncorrect || hasMissing;
        };
        const validPerformances = performances.filter(isGraded);

        if (validPerformances.length === 0) {
            return res.status(400).json({ message: 'Chưa có học sinh nào được chấm bài cho buổi học này.' });
        }

        const lessonStudents = await db.LessonStudent.findAll({ where: { lessonId } });
        const attendanceMap = {};
        lessonStudents.forEach(ls => { attendanceMap[ls.studentId] = ls.attendance; });

        const results = await Promise.allSettled(
            validPerformances.map(async (perf) => {
                const student = perf.Students && perf.Students[0];
                if (!student) throw new Error('Không có student gắn với performance');
                const comment = await aiService.generateComment({
                    totalTaskLength: lesson.totalTaskLength,
                    doneTask: perf.doneTask,
                    totalScore: perf.totalScore,
                    incorrectTasks: perf.incorrectTasks,
                    missingTasks: perf.missingTasks,
                    presentation: perf.presentation,
                    skills: perf.skills,
                    attendance: attendanceMap[student.id] || false
                });
                await perf.update({ comment });
                return { studentId: student.id, fullName: student.fullName, comment };
            })
        );

        const succeeded = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
        const failed = results
            .filter(r => r.status === 'rejected')
            .map(r => (r.reason && r.reason.message) || 'unknown error');

        return res.status(200).json({
            message: `Đã tạo ${succeeded.length}/${validPerformances.length} nhận xét`,
            results: succeeded,
            failed
        });
    } catch (error) {
        console.error('generateAiCommentForLesson error:', error);
        return res.status(500).json({ message: error.message || 'Lỗi khi tạo nhận xét AI cho cả lớp' });
    }
};

module.exports = {
    getAssistantInfo: getAssistantInfo,
    createAssistant: createAssistant,
    requestVerificationCode: requestVerificationCode,
    verifyAssistantCode: verifyAssistantCode,
    postClassAssistantCRUD: postClassAssistantCRUD,
    postAssistantDeleteCRUD: postAssistantDeleteCRUD,
    postDeleteClassAssistantCRUD: postDeleteClassAssistantCRUD,
    updateAssistant: updateAssistant,
    getAssistantClasses: getAssistantClasses,
    getClassStudentDetail: getClassStudentDetail,
    getAssistantLessons: getAssistantLessons,
    getLessonStudentsPerformance: getLessonStudentsPerformance,
    postSaveStudentPerformance: postSaveStudentPerformance,
    getLessonHomeworkList: getLessonHomeworkList,
    updateLessonHomeworkList: updateLessonHomeworkList,
    updateLessonContent: updateLessonContent,
    getLessonInfo: getLessonInfo,
    updateStudentAttendance: updateStudentAttendance,
    updateHomeworkList: updateHomeworkList,
    generateAiCommentForStudent: generateAiCommentForStudent,
    generateAiCommentForLesson: generateAiCommentForLesson,
    generateAiCommentStateless: generateAiCommentStateless
}
