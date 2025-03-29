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

module.exports = {
    getStudentInfo,
    postStudentCRUD,
    postClassStudentCRUD,
    postDeleteClassStudentCRUD,
    postStudentDeleteCRUD,
    putStudentCRUD
};
