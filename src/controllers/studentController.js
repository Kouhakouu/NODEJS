import db from '../models/index';
import CRUDservice from '../services/CRUDservice';

let getStudentInfo = async (req, res) => {
    try {
        let students = await db.Student.findAll({
            include: [
                {
                    model: db.Class,
                    as: 'classes', // Alias đã định nghĩa trong model Student
                    attributes: ['id', 'className', 'gradeLevel'],
                    through: { attributes: [] }, // Ẩn thông tin trung gian
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
    // Tạo mới 1 học sinh (giả sử người dùng truyền vào body đầy đủ thông tin)
    try {
        const data = req.body; // fullName, DOB, school, parentPhoneNumber, parentEmail
        let newStudent = await CRUDservice.createNewStudent(data);
        return res.status(201).json(newStudent);
    } catch (e) {
        console.error(e);
        return res.status(400).json({ message: e.message || 'Error creating student' });
    }
};

// Gán học sinh vào lớp
let postClassStudentCRUD = async (req, res) => {
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
        return res
            .status(400)
            .json({ message: 'Class ID và Student ID là bắt buộc.' });
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

// Hủy gán học sinh khỏi lớp
let postDeleteClassStudentCRUD = async (req, res) => {
    const { classId, studentId } = req.body;

    if (!classId || !studentId) {
        return res
            .status(400)
            .json({ message: 'Class ID và Student ID là bắt buộc.' });
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

// Xoá học sinh (tùy chọn nếu cần)
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

module.exports = {
    getStudentInfo,
    postStudentCRUD,
    postClassStudentCRUD,
    postDeleteClassStudentCRUD,
    postStudentDeleteCRUD,
    putStudentCRUD
};
