import CRUDservice from '../services/CRUDservice';
import db from '../models/index';

// các hàm gọi ở trang admin
let getTeacherInfo = async (req, res) => {
    try {
        let teachers = await db.Teacher.findAll({
            attributes: ['id', 'fullName', 'email', 'phoneNumber'],
        });
        res.json(teachers);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

let updateTeacher = async (req, res) => {
    try {
        const teacherId = req.params.id;
        const { fullName, email, phoneNumber, password } = req.body;

        const updatedTeacher = await CRUDservice.updateTeacherData(teacherId, {
            fullName,
            email,
            phoneNumber,
            password,
        });

        res.json({
            message: 'Teacher updated successfully!',
            teacher: updatedTeacher,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

let deleteTeacher = async (req, res) => {
    try {
        const teacherId = req.params.id;

        await CRUDservice.deleteTeacherData(teacherId);

        res.json({ message: 'Teacher deleted successfully!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

// các hàm gọi ở trang giáo viên
let getTeacherCourses = async (req, res) => {
    try {
        console.log("Middleware nhận được req.user:", req.user);

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }

        const teacherId = req.user.id; // Lấy ID giáo viên từ middleware

        console.log("ID giáo viên:", teacherId);

        let courses = await db.Course.findAll({
            where: { teacherId },
            attributes: ["id", "title", "description", "price"],
        });

        console.log("Khóa học lấy được:", courses);

        res.status(200).json({ message: "Lấy danh sách khóa học thành công", courses });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách khóa học:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


let createCourse = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        const teacherId = req.user.id;
        const { title, description, price } = req.body;

        if (!title || !description || price === undefined) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin khóa học." });
        }

        const newCourse = await db.Course.create({
            title,
            description,
            price,
            teacherId, // Đảm bảo teacherId luôn có giá trị
        });

        res.status(201).json({ message: "Khóa học đã được tạo thành công!", course: newCourse });
    } catch (error) {
        console.error("Lỗi khi tạo khóa học:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi tạo khóa học." });
    }
};

module.exports = {
    getTeacherInfo,
    updateTeacher,
    deleteTeacher,
    getTeacherCourses,
    createCourse
};
