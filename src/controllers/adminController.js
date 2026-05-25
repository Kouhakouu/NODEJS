const db = require('../models');

const getAdminStats = async (req, res) => {
    try {
        const [teacherCount, studentCount, assistantCount, managerCount, totalCourses, publishedCourses, classes] =
            await Promise.all([
                db.Teacher.count(),
                db.Student.count(),
                db.Assistant.count(),
                db.Manager.count(),
                db.Course.count(),
                db.Course.count({ where: { isPublished: true } }),
                db.Class.findAll({
                    attributes: ['id', 'className', 'gradeLevel'],
                    include: [
                        {
                            model: db.Student,
                            as: 'students',
                            attributes: ['id'],
                            through: { attributes: [] }
                        },
                        {
                            model: db.Lesson,
                            as: 'lessons',
                            attributes: ['id'],
                            through: { attributes: [] }
                        },
                        {
                            model: db.ClassSchedule,
                            as: 'classSchedule',
                            attributes: ['study_day', 'start_time', 'end_time'],
                            required: false
                        }
                    ]
                })
            ]);

        const classSummaries = classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: c.students?.length ?? 0,
            lessonsCount: c.lessons?.length ?? 0,
            hasSchedule: !!c.classSchedule,
            schedule: c.classSchedule
                ? {
                    study_day: c.classSchedule.study_day,
                    start_time: c.classSchedule.start_time,
                    end_time: c.classSchedule.end_time,
                }
                : null,
        }));

        return res.json({
            userCounts: {
                teachers: teacherCount,
                students: studentCount,
                assistants: assistantCount,
                managers: managerCount,
            },
            classSummaries,
            courseCounts: { total: totalCourses, published: publishedCourses },
        });
    } catch (e) {
        console.error('getAdminStats error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getAdminStats };
