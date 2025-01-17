import db from '../models/index'

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
}

module.exports = {
    getTeacherInfo: getTeacherInfo
}