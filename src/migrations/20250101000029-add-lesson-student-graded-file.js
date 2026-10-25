'use strict';
// Thêm 3 cột cho Lesson_Students: file PDF bài tập đã chấm của từng học sinh trong buổi học
// (trợ giảng upload lên Cloudinary, quản lý gửi kèm trong mail kết quả).
// Trùng nội dung với scripts/addLessonStudentGradedFile.js — dùng IF NOT EXISTS nên chạy cả hai vẫn an toàn.
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Lesson_Students"
                ADD COLUMN IF NOT EXISTS "gradedFileUrl" VARCHAR(255),
                ADD COLUMN IF NOT EXISTS "gradedFilePublicId" VARCHAR(255),
                ADD COLUMN IF NOT EXISTS "gradedFileName" VARCHAR(255)
        `);
    },
    down: async (queryInterface) => {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Lesson_Students"
                DROP COLUMN IF EXISTS "gradedFileUrl",
                DROP COLUMN IF EXISTS "gradedFilePublicId",
                DROP COLUMN IF EXISTS "gradedFileName"
        `);
    }
};
