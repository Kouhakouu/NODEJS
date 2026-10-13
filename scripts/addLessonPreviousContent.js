// Thêm cột Lessons.previousLessonContent (TEXT): "Nội dung buổi trước" do người dùng tự điền
// cho từng buổi. Trùng nội dung với migration 20250101000028 — dùng IF NOT EXISTS
// nên chạy lại bao nhiêu lần cũng an toàn (DB này không quản lý bằng sequelize-cli db:migrate):
//   node scripts/addLessonPreviousContent.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

async function main() {
    await db.sequelize.query(
        `ALTER TABLE "Lessons" ADD COLUMN IF NOT EXISTS "previousLessonContent" TEXT`
    );
    console.log('OK: Lessons.previousLessonContent (TEXT)');
    await db.sequelize.close();
    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
