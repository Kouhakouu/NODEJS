// Thêm cột Lessons.nextHomework (TEXT): nội dung "BTVN tuần sau" nhập dạng văn bản tự do.
// Trùng nội dung với migration 20250101000026 — dùng IF NOT EXISTS nên chạy lại bao nhiêu
// lần cũng an toàn (DB này không quản lý bằng sequelize-cli db:migrate):
//   node scripts/addLessonNextHomework.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

async function main() {
    await db.sequelize.query(
        `ALTER TABLE "Lessons" ADD COLUMN IF NOT EXISTS "nextHomework" TEXT`
    );
    console.log('OK: Lessons.nextHomework (TEXT)');
    await db.sequelize.close();
    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
