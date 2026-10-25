// Thêm các cột Lesson_Students.gradedFileUrl / gradedFilePublicId / gradedFileName:
// file PDF bài tập đã chấm của từng học sinh (gửi kèm mail kết quả). Trùng nội dung với
// migration 20250101000029 — dùng IF NOT EXISTS nên chạy lại bao nhiêu lần cũng an toàn
// (DB này không quản lý bằng sequelize-cli db:migrate):
//   node scripts/addLessonStudentGradedFile.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

async function main() {
    await db.sequelize.query(`
        ALTER TABLE "Lesson_Students"
            ADD COLUMN IF NOT EXISTS "gradedFileUrl" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "gradedFilePublicId" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "gradedFileName" VARCHAR(255)
    `);
    console.log('OK: Lesson_Students.gradedFileUrl / gradedFilePublicId / gradedFileName');
    await db.sequelize.close();
    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
