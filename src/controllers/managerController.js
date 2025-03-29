import db from '../models/index';
import CRUDservice from '../services/CRUDservice';

let getManagerInfo = async (req, res) => {
    try {
        let managers = await db.Manager.findAll({
            attributes: ['id', 'fullName', 'email', 'phoneNumber', 'gradeLevel'],
        });
        res.json(managers);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

let updateManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Lưu ý: thêm gradeLevel vì Manager có thuộc tính này
        const { fullName, email, phoneNumber, password, gradeLevel } = req.body;

        const updatedManager = await CRUDservice.updateManagerData(managerId, {
            fullName,
            email,
            phoneNumber,
            password,
            gradeLevel,
        });

        res.json({
            message: 'Manager updated successfully!',
            manager: updatedManager,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

let deleteManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        await CRUDservice.deleteManagerData(managerId);
        res.json({ message: 'Manager deleted successfully!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

//trang quản lý

const getManagerClasses = async (req, res) => {
    try {
        const managerId = req.user.id; // Lấy ID của quản lý từ token

        // Tìm gradeLevel của Manager
        let manager = await db.Manager.findByPk(managerId, {
            attributes: ['gradeLevel']
        });

        if (!manager) {
            return res.status(404).json({ message: 'Manager not found' });
        }

        // Tìm các lớp có gradeLevel trùng với gradeLevel của Manager và lấy thông tin lịch học
        let classes = await db.Class.findAll({
            where: { gradeLevel: manager.gradeLevel },
            attributes: ['id', 'className', 'gradeLevel', 'class_schedule_id'],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['study_day', 'start_time', 'end_time']
                }
            ]
        });

        return res.status(200).json(classes);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching manager classes' });
    }
};

const createLesson = async (req, res) => {
    try {
        // Lấy dữ liệu lessonDate và classId từ req.body
        const { lessonDate, classId } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!lessonDate || !classId) {
            return res.status(400).json({ message: 'lessonDate và classId là bắt buộc' });
        }

        // Tạo mới một bản ghi trong bảng Lesson
        let newLesson = await db.Lesson.create({
            lessonContent: '', // để trống
            totalTaskLength: '', // để trống
            lessonDate: lessonDate, // do người dùng nhập vào
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Thêm bản ghi vào bảng Lesson_Classes với lessonId vừa tạo và classId do người dùng chọn
        let newLessonClass = await db.LessonClass.create({
            lessonId: newLesson.id,
            classId: classId,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return res.status(201).json({
            message: 'Tạo mới buổi học thành công!',
            lesson: newLesson,
            lessonClass: newLessonClass
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || 'Internal server error' });
    }
};


module.exports = {
    getManagerInfo,
    updateManager,
    deleteManager,
    getManagerClasses,
    createLesson
};
