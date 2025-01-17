import db from '../models/index'

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
}

module.exports = {
    getManagerInfo: getManagerInfo
}