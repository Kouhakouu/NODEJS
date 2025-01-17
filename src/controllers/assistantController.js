import db from '../models/index'
import CRUDservice from '../services/CRUDservice'

let getAssistantInfo = async (req, res) => {
    try {
        let assistants = await db.Assistant.findAll({
            include: [
                {
                    model: db.Class,
                    as: 'classes',
                    attributes: ['id', 'className', 'gradeLevel'],
                    through: { attributes: [] }, // Loại bỏ thông tin từ bảng liên kết
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
        return res.status(400).json({ message: 'Class ID và Assistant ID là bắt buộc.' });
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
    // Hàm xóa trợ giảng (giả sử đã có)
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
        return res.status(400).json({ message: 'Class ID và Assistant ID là bắt buộc.' });
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
    // Lấy id từ URL params, data từ body
    let assistantId = req.params.id; // nếu bạn dùng /assistant-update-crud/:id
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


module.exports = {
    getAssistantInfo: getAssistantInfo,
    postClassAssistantCRUD: postClassAssistantCRUD,
    postAssistantDeleteCRUD: postAssistantDeleteCRUD,
    postDeleteClassAssistantCRUD: postDeleteClassAssistantCRUD,
    updateAssistant: updateAssistant
}