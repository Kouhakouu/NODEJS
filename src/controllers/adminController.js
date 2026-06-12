const db = require('../models');
const { getClassCounts } = require('../utils/classCounts');

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
                    include: [{
                        model: db.ClassSchedule,
                        as: 'classSchedule',
                        attributes: ['study_day', 'start_time', 'end_time'],
                        required: false
                    }]
                })
            ]);

        // Sĩ số / số buổi đếm bằng 2 query GROUP BY, không join students + lessons cùng lúc
        const { studentCounts, lessonCounts } = await getClassCounts(classes.map(c => c.id));

        const classSummaries = classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: studentCounts.get(c.id) ?? 0,
            lessonsCount: lessonCounts.get(c.id) ?? 0,
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
