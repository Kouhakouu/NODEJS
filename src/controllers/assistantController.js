const bcrypt = require('bcryptjs');
import db from '../models/index';
import CRUDservice from '../services/CRUDservice';

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
        return res.status(500).json({ message: 'Error fetching assistant data.' });
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
        let result = await CRUDservice.createClassAssistant({ classId, assistantId });
        return res.status(200).json({ message: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: e.message || 'Error assigning class to assistant.' });
    }
};

const postDeleteClassAssistantCRUD = async (req, res) => {
    const { classId, assistantId } = req.body;
    if (!classId || !assistantId) {
        return res.status(400).json({ message: 'Class ID and Assistant ID are required.' });
    }
    try {
        let result = await CRUDservice.deleteClassAssistant({ classId, assistantId });
        return res.status(200).json({ message: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: e.message || 'Error removing class from assistant.' });
    }
};

let postAssistantDeleteCRUD = async (req, res) => {
    const { id } = req.body;
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

//trang trợ giảng
const getAssistantClasses = async (req, res) => {
    try {
        const assistantId = req.user.userId;

        // Tìm trợ giảng & lấy kèm các lớp + lịch + sĩ số + số bài
        const assistant = await db.Assistant.findByPk(assistantId, {
            include: [{
                model: db.Class,
                as: 'classes',
                attributes: ['id', 'className', 'gradeLevel'],
                through: { attributes: [] },
                include: [
                    {                             // lịch học
                        model: db.ClassSchedule,
                        as: 'classSchedule',
                        attributes: ['study_day', 'start_time', 'end_time']
                    },
                    {                             // để đếm sĩ số
                        model: db.Student,
                        as: 'students',
                        attributes: ['id']
                    },
                    {                             // để đếm bài / buổi
                        model: db.Lesson,
                        as: 'lessons',
                        attributes: ['id']
                    }
                ]
            }]
        });

        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }

        // Chuyển lớp về dạng gọn gửi cho FE
        const result = assistant.classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: c.students?.length ?? 0,
            assignmentsCount: c.lessons?.length ?? 0,
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
                    attributes: ['id', 'lessonContent', 'totalTaskLength', 'lessonDate'],
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

        // Lấy thông tin lớp và danh sách học sinh
        const classDetail = await db.Class.findByPk(classId, {
            include: [
                {
                    model: db.Student,
                    as: 'students',
                    attributes: ['id', 'fullName', 'school', 'parentPhoneNumber', 'parentEmail'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!classDetail) {
            return res.status(404).json({ message: 'Class not found' });
        }

        const studentIds = classDetail.students.map(student => student.id);

        // Truy vấn StudentPerformance (được định nghĩa trong file studentPerformance.js)
        const performances = await db.StudentPerformance.findAll({
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
        });

        // Xây dựng map theo studentId (giả sử mỗi performance chỉ liên quan đến 1 học sinh)
        const performanceMap = {};
        performances.forEach(perf => {
            if (perf.Students && perf.Students.length > 0) {
                const studentId = perf.Students[0].id;
                // Nếu có nhiều performance cho 1 học sinh, chỉ lấy bản ghi đầu tiên
                if (!performanceMap[studentId]) {
                    performanceMap[studentId] = perf.toJSON();
                }
            }
        });

        // Truy vấn bảng LessonStudent cho lessonId và các học sinh liên quan
        const lessonStudents = await db.LessonStudent.findAll({
            where: {
                lessonId,
                studentId: { [db.Sequelize.Op.in]: studentIds }
            }
        });

        // Tạo map từ lessonStudent theo studentId
        const lessonStudentMap = {};
        lessonStudents.forEach(ls => {
            lessonStudentMap[ls.studentId] = ls;
        });

        // Ghép dữ liệu kết quả cho từng học sinh
        const studentsWithPerformance = classDetail.students.map(student => {
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
    if (!studentId || !lessonId || !performance) {
        return res.status(400).json({ message: 'Student ID, Lesson ID và dữ liệu performance là bắt buộc.' });
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
        const { homeworkList } = req.body;
        if (typeof homeworkList !== "string") {
            return res.status(400).json({ message: 'Homework list must be provided as a string.' });
        }

        const lesson = await db.Lesson.findByPk(lessonId);
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
        const { lessonContent } = req.body;

        if (!lessonContent || lessonContent.trim() === '') {
            return res.status(400).json({ message: 'Nội dung buổi học không được để trống.' });
        }

        // Kiểm tra buổi học có tồn tại
        const lesson = await db.Lesson.findByPk(lessonId);
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
            attributes: ['id', 'lessonDate', 'lessonContent', 'totalTaskLength', 'homeworkList']
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

module.exports = {
    getAssistantInfo: getAssistantInfo,
    createAssistant: createAssistant,
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
    getLessonInfo: getLessonInfo
}