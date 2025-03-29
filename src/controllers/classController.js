import db from '../models/index';
import CRUDservice from '../services/CRUDservice';

// Function to format time to 'HH:mm'
let formatTime = (time) => {
    if (!time) return null;
    let date = new Date(time);
    return date.toISOString().substr(11, 5);
};

let getClassInfo = async (req, res) => {
    try {
        let classes = await db.Class.findAll({
            attributes: ['id', 'className', 'gradeLevel', 'class_schedule_id'],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['study_day', 'start_time', 'end_time']
                },
                {
                    model: db.ClassTeacher,
                    as: 'classTeacher',
                    attributes: ['teacher_id'],
                    include: [
                        {
                            model: db.Teacher,
                            as: 'teacher',
                            attributes: ['id', 'fullName', 'email', 'phoneNumber']
                        }
                    ]
                },
                {
                    model: db.Assistant,
                    as: 'assistants',
                    attributes: ['id', 'fullName', 'email', 'phoneNumber'],
                    through: { attributes: [] }
                }
            ]
        });

        // Format time fields to 'HH:mm'
        let formattedClasses = classes.map(cls => {
            if (cls.classSchedule) {
                cls.classSchedule.start_time = formatTime(cls.classSchedule.start_time);
                cls.classSchedule.end_time = formatTime(cls.classSchedule.end_time);
            }
            return cls;
        });

        res.json(formattedClasses);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

let getClassScheduleInfo = async (req, res) => {
    try {
        let classSchedules = await CRUDservice.getAllClassSchedules();
        return res.status(200).json(classSchedules);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error retrieving class schedule information' });
    }
};

let postClassCRUD = async (req, res) => {
    const data = req.body;
    try {
        let newClass = await CRUDservice.createClass(data);
        return res.status(201).json(newClass);
    } catch (e) {
        console.error(e);
        return res.status(400).json({ message: e.message || 'Error creating class' });
    }
};

module.exports = {
    getClassInfo: getClassInfo,
    getClassScheduleInfo: getClassScheduleInfo,
    postClassCRUD: postClassCRUD
};
