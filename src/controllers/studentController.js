import db from '../models/index';
import CRUDservice from '../services/CRUDservice';

let getStudentInfo = async (req, res) => {
    try {
        let students = await db.Student.findAll({
            include: [
                {
                    model: db.Class,
                    as: 'classes',
                    attributes: ['id', 'className', 'gradeLevel'],
                    through: { attributes: [] },
                },
            ],
        });
        return res.status(200).json(students);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching student data.' });
    }
};

let postStudentCRUD = async (req, res) => {
    try {
        const data = req.body;
        let newStudent = await CRUDservice.createNewStudent(data);
        return res.status(201).json(newStudent);
    } catch (e) {
        console.error(e);
        return res.status(400).json({ message: e.message || 'Error creating student' });
    }
};

let postClassStudentCRUD = async (req, res) => {
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
        return res
            .status(400)
            .json({ message: 'Class ID and Student ID are required.' });
    }

    try {
        let result = await CRUDservice.createClassStudent({ classId, studentId });
        return res.status(200).json({ message: result });
    } catch (e) {
        console.error(e);
        return res
            .status(500)
            .json({ message: e.message || 'Error assigning class to student.' });
    }
};

let postDeleteClassStudentCRUD = async (req, res) => {
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
        return res
            .status(400)
            .json({ message: 'Class ID and Student ID are required.' });
    }

    try {
        let result = await CRUDservice.deleteClassStudent({ classId, studentId });
        return res.status(200).json({ message: result });
    } catch (e) {
        console.error(e);
        return res
            .status(500)
            .json({ message: e.message || 'Error removing class from student.' });
    }
};

let postStudentDeleteCRUD = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Student ID is required.' });
    }

    try {
        await CRUDservice.deleteStudent(id);
        return res.status(200).json({ message: 'Student deleted successfully!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: e.message || 'Error deleting student.' });
    }
};

let putStudentCRUD = async (req, res) => {
    try {
        let updatedStudent = await CRUDservice.updateStudent(req.body)
        return res.status(200).json(updatedStudent)
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: e.message || 'Error updating student.' })
    }
}

// ─── Trang học sinh ────────────────────────────────────────────────────────

let getStudentClasses = async (req, res) => {
    try {
        const userIdFromToken = req.user.userId;

        const student = await db.Student.findOne({
            where: { userId: userIdFromToken },
            include: [{
                model: db.Class,
                as: 'classes',
                attributes: ['id', 'className', 'gradeLevel'],
                through: { attributes: [] },
                include: [
                    {
                        model: db.ClassSchedule,
                        as: 'classSchedule',
                        attributes: ['study_day', 'start_time', 'end_time']
                    },
                    {
                        model: db.Lesson,
                        as: 'lessons',
                        attributes: ['id']
                    }
                ]
            }]
        });

        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh.' });
        }

        const result = student.classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            lessonsCount: c.lessons?.length ?? 0,
            schedule: c.classSchedule ? {
                study_day: c.classSchedule.study_day,
                start_time: c.classSchedule.start_time,
                end_time: c.classSchedule.end_time
            } : null
        }));

        return res.status(200).json(result);
    } catch (err) {
        console.error('getStudentClasses error:', err);
        return res.status(500).json({ message: 'Lỗi khi lấy danh sách lớp học.' });
    }
};

let getStudentClassDetail = async (req, res) => {
    try {
        const userIdFromToken = req.user.userId;
        const classId = parseInt(req.params.id, 10);

        // Tìm học sinh theo userId
        const student = await db.Student.findOne({ where: { userId: userIdFromToken } });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh.' });
        }

        // Lấy thông tin lớp + xác minh học sinh thuộc lớp này (required: true = INNER JOIN)
        const classDetail = await db.Class.findByPk(classId, {
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['study_day', 'start_time', 'end_time']
                },
                {
                    model: db.Lesson,
                    as: 'lessons',
                    attributes: ['id', 'lessonContent', 'lessonDate', 'totalTaskLength', 'isLocked']
                },
                {
                    model: db.Student,
                    as: 'students',
                    where: { id: student.id },
                    required: true,
                    attributes: [],
                    through: { attributes: [] }
                }
            ]
        });

        if (!classDetail) {
            return res.status(403).json({ message: 'Bạn không thuộc lớp này hoặc lớp không tồn tại.' });
        }

        const lessonIds = classDetail.lessons.map(l => l.id);

        // Điểm danh từng buổi
        const lessonStudents = lessonIds.length > 0
            ? await db.LessonStudent.findAll({
                where: { studentId: student.id, lessonId: { [db.Sequelize.Op.in]: lessonIds } }
            })
            : [];
        const attendanceMap = {};
        lessonStudents.forEach(ls => { attendanceMap[ls.lessonId] = ls.attendance; });

        // Kết quả học tập: tìm qua 2 bảng trung gian
        const perfStudents = await db.StudentPerformanceStudent.findAll({
            where: { studentId: student.id }
        });
        const perfIds = perfStudents.map(ps => ps.studentPerformanceId);

        const perfLessons = perfIds.length > 0 && lessonIds.length > 0
            ? await db.StudentPerformanceLesson.findAll({
                where: {
                    studentPerformanceId: { [db.Sequelize.Op.in]: perfIds },
                    lessonId: { [db.Sequelize.Op.in]: lessonIds }
                }
            })
            : [];

        const performances = perfLessons.length > 0
            ? await db.StudentPerformance.findAll({
                where: { id: { [db.Sequelize.Op.in]: perfLessons.map(pl => pl.studentPerformanceId) } }
            })
            : [];

        const performanceByLesson = {};
        perfLessons.forEach(pl => {
            const perf = performances.find(p => p.id === pl.studentPerformanceId);
            if (perf) performanceByLesson[pl.lessonId] = perf;
        });

        const lessons = classDetail.lessons.map(lesson => ({
            id: lesson.id,
            lessonContent: lesson.lessonContent,
            lessonDate: lesson.lessonDate,
            totalTaskLength: lesson.totalTaskLength,
            isLocked: lesson.isLocked,
            attendance: attendanceMap[lesson.id] ?? null,
            performance: performanceByLesson[lesson.id]
                ? {
                    doneTask: performanceByLesson[lesson.id].doneTask,
                    totalScore: performanceByLesson[lesson.id].totalScore,
                    incorrectTasks: performanceByLesson[lesson.id].incorrectTasks,
                    missingTasks: performanceByLesson[lesson.id].missingTasks,
                    presentation: performanceByLesson[lesson.id].presentation,
                    skills: performanceByLesson[lesson.id].skills,
                    comment: performanceByLesson[lesson.id].comment
                }
                : null
        }));

        return res.status(200).json({
            id: classDetail.id,
            className: classDetail.className,
            gradeLevel: classDetail.gradeLevel,
            schedule: classDetail.classSchedule
                ? {
                    study_day: classDetail.classSchedule.study_day,
                    start_time: classDetail.classSchedule.start_time,
                    end_time: classDetail.classSchedule.end_time
                }
                : null,
            lessons
        });
    } catch (err) {
        console.error('getStudentClassDetail error:', err);
        return res.status(500).json({ message: 'Lỗi khi lấy thông tin lớp học.' });
    }
};

module.exports = {
    getStudentInfo,
    postStudentCRUD,
    postClassStudentCRUD,
    postDeleteClassStudentCRUD,
    postStudentDeleteCRUD,
    putStudentCRUD,
    getStudentClasses,
    getStudentClassDetail
};
