'use strict';
// Index phụ cho cột FK / cột lọc hay dùng (Postgres không tự index FK).
// Trùng nội dung với scripts/addIndexes.js — dùng IF NOT EXISTS nên chạy cả hai vẫn an toàn.

const INDEXES = [
    ['Student_Classes', 'classId'],
    ['Lesson_Classes', 'classId'],
    ['Lesson_Students', 'studentId'],
    ['StudentPerformance_Lessons', 'lessonId'],
    ['StudentPerformance_Students', 'studentId'],
    ['Class_Assistants', 'assistantId'],
    ['ClassTeachers', 'teacher_id'],
    ['ClassTeachers', 'class_id'],
    ['Classes', 'gradeLevel'],
    ['Classes', 'class_schedule_id'],
    ['Students', 'userId'],
    ['Documents', 'teacherId'],
    ['Courses', 'teacherId'],
    ['Courses', 'isPublished'],
    ['Lessons', 'lessonDate'],
];

const indexName = (table, column) => `idx_${table}_${column}`.toLowerCase();

module.exports = {
    up: async (queryInterface) => {
        for (const [table, column] of INDEXES) {
            await queryInterface.sequelize.query(
                `CREATE INDEX IF NOT EXISTS "${indexName(table, column)}" ON "${table}" ("${column}")`
            );
        }
    },
    down: async (queryInterface) => {
        for (const [table, column] of INDEXES) {
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "${indexName(table, column)}"`
            );
        }
    }
};
