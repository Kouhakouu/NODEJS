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

const getClassDetail = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        console.log("🔍 Fetching class details for ID:", classId);

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
        const classId = req.class.id;
        let classroom = await db.Class.findByPk(classId, {
            include: [
                {
                    model: db.Lesson,
                    as: 'lessons',
                    attributes: ['id', 'lessonContent', 'totalTaskLength'],
                }
            ]
        });

        if (!classroom) {
            return res.status(404).json({ message: 'Class not found' });
        }

        return res.status(200).json(classroom.lessons);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error fetching lessons ' });
    }
};

module.exports = {
    getAssistantInfo: getAssistantInfo,
    postClassAssistantCRUD: postClassAssistantCRUD,
    postAssistantDeleteCRUD: postAssistantDeleteCRUD,
    postDeleteClassAssistantCRUD: postDeleteClassAssistantCRUD,
    updateAssistant: updateAssistant,
    getAssistantClasses: getAssistantClasses,
    getClassDetail: getClassDetail,
    getAssistantLessons: getAssistantLessons
}