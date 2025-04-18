import db from "../models/index";

let getSchedules = async (req, res) => {
    try {
        const schedules = await db.ClassSchedule.findAll();

        // format time
        const formattedSchedules = schedules.map((schedule) => {
            const startTime = schedule.start_time instanceof Date
                ? schedule.start_time.toISOString().slice(11, 16)
                : schedule.start_time;
            const endTime = schedule.end_time instanceof Date
                ? schedule.end_time.toISOString().slice(11, 16)
                : schedule.end_time;

            return {
                ...schedule.toJSON(),
                start_time: startTime,
                end_time: endTime,
            };
        });

        res.status(200).json(formattedSchedules);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ error: "Error fetching schedules" });
    }
};



let createSchedule = async (req, res) => {
    const { study_day, start_time, end_time } = req.body;

    try {
        const newSchedule = await db.ClassSchedule.create({
            study_day,
            start_time,
            end_time,
        });
        res.status(201).json(newSchedule);
    } catch (error) {
        console.error("Error creating schedule:", error);
        res.status(500).json({ error: "Error creating schedule" });
    }
};

let editSchedule = async (req, res) => {
    const { id } = req.params;
    const { study_day, start_time, end_time } = req.body;

    try {
        const schedule = await db.ClassSchedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        schedule.study_day = study_day;
        schedule.start_time = start_time;
        schedule.end_time = end_time;
        await schedule.save();

        res.status(200).json(schedule);
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ error: "Error updating schedule" });
    }
};

let deleteSchedule = async (req, res) => {
    const { id } = req.params;

    try {
        const schedule = await db.ClassSchedule.findByPk(id);
        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        await schedule.destroy();
        res.status(200).json({ message: "Schedule deleted successfully" });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        res.status(500).json({ error: "Error deleting schedule" });
    }
};

module.exports = {
    getSchedules: getSchedules,
    createSchedule: createSchedule,
    editSchedule: editSchedule,
    deleteSchedule: deleteSchedule,
};
