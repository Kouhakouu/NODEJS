import db from '../models/index'
import CRUDservice from '../services/CRUDservice'

//trang admin
let getAssistantInfo = async (req, res) => {
    try {
        let assistants = await db.Assistant.findAll({
            include: [
                {
                    model: db.Class,
                    as: 'classes',
                    attributes: ['id', 'className', 'gradeLevel'],
                    through: { attributes: [] },
                },
            ],
        });
        return res.status(200).json(assistants);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching assistant data.' });
    }
};

let postClassAssistantCRUD = async (req, res) => {
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

let postDeleteClassAssistantCRUD = async (req, res) => {
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
        const assistantId = req.user.id;

        let assistant = await db.Assistant.findByPk(assistantId, {
            include: [
                {
                    model: db.Class,
                    as: 'classes',
                    attributes: ['id', 'className', 'gradeLevel'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!assistant) {
            return res.status(404).json({ message: 'Assistant not found' });
        }

        return res.status(200).json(assistant.classes);
    } catch (e) {
        console.error(e);
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
                    attributes: ['id', 'fullName', 'school', 'parentPhoneNumber', 'parentEmail'],
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

        // Lấy danh sách các học sinh
        const studentIds = classDetail.students.map(student => student.id);

        // Truy vấn tất cả các performance của học sinh liên quan đến lessonId
        const performances = await db.Performance.findAll({
            include: [{
                model: db.Lesson,
                where: { id: lessonId },
                attributes: [] // không cần lấy thông tin của Lesson
            }],
            where: { studentId: { [db.Sequelize.Op.in]: studentIds } }
        });

        // Tạo map theo studentId (nếu có nhiều bản ghi, chỉ lưu bản ghi đầu tiên)
        const performanceMap = {};
        performances.forEach(perf => {
            if (!performanceMap[perf.studentId]) {
                performanceMap[perf.studentId] = perf.toJSON();
            }
        });

        // Truy vấn bảng LessonStudent cho lessonId và các học sinh
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

    // Nếu incorrectTasks và missingTasks là mảng, chuyển chúng thành chuỗi phân tách bởi dấu chấm phẩy.
    const formattedIncorrectTasks = Array.isArray(incorrectTasks) ? incorrectTasks.join("; ") : incorrectTasks;
    const formattedMissingTasks = Array.isArray(missingTasks) ? missingTasks.join("; ") : missingTasks;

    const t = await db.sequelize.transaction();

    try {
        // Bước 1: Tìm các bản ghi liên kết trong StudentPerformanceStudent theo studentId
        const performanceStudentRecords = await db.StudentPerformanceStudent.findAll({
            where: { studentId },
            transaction: t
        });

        // Lấy danh sách các studentPerformanceId
        const performanceIds = performanceStudentRecords.map(record => record.studentPerformanceId);

        let existingPerformance = null;
        if (performanceIds.length > 0) {
            // Bước 2: Tìm bản ghi trong StudentPerformanceLesson với lessonId được truyền và thuộc một trong các performanceIds trên
            const performanceLessonRecord = await db.StudentPerformanceLesson.findOne({
                where: {
                    studentPerformanceId: performanceIds,
                    lessonId: lessonId
                },
                transaction: t
            });
            if (performanceLessonRecord) {
                // Nếu đã tồn tại, lấy bản ghi StudentPerformance chính
                existingPerformance = await db.StudentPerformance.findByPk(performanceLessonRecord.studentPerformanceId, { transaction: t });
            }
        }

        let performanceRecord;
        if (existingPerformance) {
            // Nếu đã tồn tại bản ghi cho cặp học sinh – buổi học, update dữ liệu
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
            // Nếu chưa tồn tại, tạo mới bản ghi và thiết lập liên kết cho StudentPerformanceLesson và StudentPerformanceStudent
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

module.exports = {
    getAssistantInfo: getAssistantInfo,
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
}