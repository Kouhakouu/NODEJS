// controllers/classController.js
import db from '../models';

const formatTime = time => {
    if (!time) return null;
    const d = new Date(time);
    return d.toISOString().substr(11, 5);
};

// GET /get-class-info
export const getClassInfo = async (req, res) => {
    try {
        const classes = await db.Class.findAll({
            attributes: ['id', 'className', 'gradeLevel', 'class_schedule_id'],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['id', 'study_day', 'start_time', 'end_time']
                },
                {
                    model: db.ClassTeacher,
                    as: 'classTeacher',
                    attributes: ['teacher_id'],
                    include: [{
                        model: db.Teacher,
                        as: 'teacher',
                        attributes: ['userId', 'fullName']
                    }]
                },
                {
                    model: db.Assistant,
                    as: 'assistants',
                    attributes: ['userId', 'fullName'],
                    through: { attributes: [] }
                }
            ]
        });

        // Format giờ lên HH:mm
        const out = classes.map(c => {
            if (c.classSchedule) {
                c.classSchedule.start_time = formatTime(c.classSchedule.start_time);
                c.classSchedule.end_time = formatTime(c.classSchedule.end_time);
            }
            return c;
        });

        return res.json(out);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /get-class-schedule-info
export const getClassScheduleInfo = async (req, res) => {
    try {
        const schedules = await db.ClassSchedule.findAll({
            attributes: ['id', 'study_day', 'start_time', 'end_time']
        });
        const out = schedules.map(s => ({
            id: s.id,
            study_day: s.study_day,
            start_time: formatTime(s.start_time),
            end_time: formatTime(s.end_time)
        }));
        return res.json(out);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Cannot fetch schedules' });
    }
};

// POST /class-post-crud
export const createClass = async (req, res) => {
    try {
        const { className, gradeLevel, teacherId, classScheduleId } = req.body;
        if (!className || !gradeLevel) {
            return res.status(400).json({ message: 'Thiếu tên lớp hoặc khối.' });
        }
        // 1) tạo bản ghi lớp
        const cls = await db.Class.create({
            className,
            gradeLevel,
            class_schedule_id: classScheduleId || null
        });
        // 2) gán giáo viên (nếu có)
        if (teacherId) {
            await db.ClassTeacher.create({
                class_id: cls.id,
                teacher_id: teacherId
            });
        }
        return res.status(201).json(cls);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Error creating class.' });
    }
};

// PUT /class-update-crud/:id
export const updateClass = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        const { className, gradeLevel, teacherId, classScheduleId } = req.body;
        // 1) cập nhật bảng Class
        const cls = await db.Class.findByPk(classId);
        if (!cls) return res.status(404).json({ message: 'Class not found.' });

        cls.className = className;
        cls.gradeLevel = gradeLevel;
        cls.class_schedule_id = classScheduleId || null;
        await cls.save();

        // 2) cập nhật bảng ClassTeacher
        const ct = await db.ClassTeacher.findOne({ where: { class_id: classId } });
        if (teacherId) {
            if (ct) {
                ct.teacher_id = teacherId;
                await ct.save();
            } else {
                await db.ClassTeacher.create({ class_id: classId, teacher_id: teacherId });
            }
        } else if (ct) {
            // nếu xóa teacherId thì hủy assignment
            await ct.destroy();
        }

        return res.json({ message: 'Update successful.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Error updating class.' });
    }
};

// DELETE /class-delete-crud/:id
export const deleteClass = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        const del = await db.Class.destroy({ where: { id: classId } });
        if (!del) return res.status(404).json({ message: 'Class not found.' });
        return res.json({ message: 'Class deleted.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Error deleting class.' });
    }
};

module.exports = {
    getClassInfo,
    getClassScheduleInfo,
    createClass,
    updateClass,
    deleteClass
};
