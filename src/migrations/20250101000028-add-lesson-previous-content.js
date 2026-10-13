'use strict';
// Thêm cột Lessons.previousLessonContent (TEXT): "Nội dung buổi trước" do người dùng tự điền
// cho từng buổi học, không lấy từ lessonContent của buổi liền trước.
// Trùng nội dung với scripts/addLessonPreviousContent.js — dùng IF NOT EXISTS nên chạy cả hai vẫn an toàn.
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.sequelize.query(
            `ALTER TABLE "Lessons" ADD COLUMN IF NOT EXISTS "previousLessonContent" TEXT`
        );
    },
    down: async (queryInterface) => {
        await queryInterface.sequelize.query(
            `ALTER TABLE "Lessons" DROP COLUMN IF EXISTS "previousLessonContent"`
        );
    }
};
