'use strict';
// Thêm cột Lessons.nextHomework (TEXT): nội dung "BTVN tuần sau" nhập dạng văn bản tự do,
// tách biệt với homeworkList (danh sách bài tập phân tách bằng dấu phẩy dùng để chấm điểm).
// Trùng nội dung với scripts/addLessonNextHomework.js — dùng IF NOT EXISTS nên chạy cả hai vẫn an toàn.
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.sequelize.query(
            `ALTER TABLE "Lessons" ADD COLUMN IF NOT EXISTS "nextHomework" TEXT`
        );
    },
    down: async (queryInterface) => {
        await queryInterface.sequelize.query(
            `ALTER TABLE "Lessons" DROP COLUMN IF EXISTS "nextHomework"`
        );
    }
};
