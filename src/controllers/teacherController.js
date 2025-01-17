// teacherController.js

import CRUDservice from '../services/CRUDservice'; // Ensure the correct path
import db from '../models/index'; // If needed for additional operations

// Existing getTeacherInfo method
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

// New updateTeacher method
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

// New deleteTeacher method
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

module.exports = {
    getTeacherInfo,
    updateTeacher,
    deleteTeacher,
};
