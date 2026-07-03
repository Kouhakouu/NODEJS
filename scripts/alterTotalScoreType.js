// Đổi kiểu cột StudentPerformances.totalScore từ INTEGER sang DOUBLE PRECISION.
// Lý do: tổng điểm là tổng các điểm thành phần 0.25 / 0.5 / 0.75 nên có thể là số
// thập phân (vd 1.5), gây lỗi 'invalid input syntax for type integer: "1.5"' khi lưu.
// Trùng nội dung với migration 20250101000025 — ALTER ... TYPE là idempotent nên
// chạy lại bao nhiêu lần cũng an toàn:
//   node scripts/alterTotalScoreType.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

async function main() {
    await db.sequelize.query(
        `ALTER TABLE "StudentPerformances" ` +
        `ALTER COLUMN "totalScore" TYPE DOUBLE PRECISION ` +
        `USING "totalScore"::double precision`
    );
    console.log('OK: StudentPerformances.totalScore -> DOUBLE PRECISION');
    await db.sequelize.close();
    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
