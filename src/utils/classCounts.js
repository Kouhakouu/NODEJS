const db = require('../models');

// Đếm sĩ số và số buổi học cho nhiều lớp cùng lúc bằng 2 query GROUP BY nhỏ.
// Tránh pattern include cả students lẫn lessons chỉ để đếm .length:
// 2 include N-N trong 1 query tạo tích Descartes (số hàng = sĩ số x số buổi cho mỗi lớp).
async function getClassCounts(classIds) {
    if (!classIds || classIds.length === 0) {
        return { studentCounts: new Map(), lessonCounts: new Map() };
    }

    const [[studentRows], [lessonRows]] = await Promise.all([
        db.sequelize.query(
            `SELECT "classId", COUNT(*)::int AS count
             FROM "Student_Classes"
             WHERE "classId" IN (:classIds)
             GROUP BY "classId"`,
            { replacements: { classIds } }
        ),
        db.sequelize.query(
            `SELECT "classId", COUNT(*)::int AS count
             FROM "Lesson_Classes"
             WHERE "classId" IN (:classIds)
             GROUP BY "classId"`,
            { replacements: { classIds } }
        )
    ]);

    return {
        studentCounts: new Map(studentRows.map(r => [r.classId, r.count])),
        lessonCounts: new Map(lessonRows.map(r => [r.classId, r.count]))
    };
}

module.exports = { getClassCounts };
