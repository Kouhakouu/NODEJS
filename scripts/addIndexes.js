// Thêm index phụ cho các cột FK / cột lọc hay dùng.
// Postgres KHÔNG tự tạo index cho foreign key, và index PK ghép chỉ dùng được
// khi lọc theo cột đầu tiên — nên các truy vấn lọc theo cột thứ hai cần index riêng.
// Idempotent (IF NOT EXISTS) — chạy lại bao nhiêu lần cũng an toàn:
//   node scripts/addIndexes.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

const INDEXES = [
    // Junction tables: PK ghép chỉ phủ cột đầu, thêm index cho cột còn lại
    ['Student_Classes', 'classId'],                 // đếm sĩ số, snapshot học sinh theo lớp
    ['Lesson_Classes', 'classId'],                  // lấy buổi học theo lớp
    ['Lesson_Students', 'studentId'],               // điểm danh theo học sinh
    ['StudentPerformance_Lessons', 'lessonId'],     // kết quả theo buổi học
    ['StudentPerformance_Students', 'studentId'],   // kết quả theo học sinh
    ['Class_Assistants', 'assistantId'],            // lớp của trợ giảng

    // FK trên bảng thường
    ['ClassTeachers', 'teacher_id'],                // lớp của giáo viên
    ['ClassTeachers', 'class_id'],                  // giáo viên của lớp
    ['Classes', 'gradeLevel'],                      // manager lọc lớp theo khối
    ['Classes', 'class_schedule_id'],               // join lịch học
    ['Students', 'userId'],                         // tra học sinh theo tài khoản
    ['Documents', 'teacherId'],                     // tài liệu của giáo viên
    ['Courses', 'teacherId'],                       // khóa học của giáo viên
    ['Courses', 'isPublished'],                     // trang public lọc khóa học

    // Sắp xếp / tìm buổi học trước theo ngày
    ['Lessons', 'lessonDate'],
];

async function main() {
    for (const [table, column] of INDEXES) {
        const indexName = `idx_${table}_${column}`.toLowerCase();
        await db.sequelize.query(
            `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" ("${column}")`
        );
        console.log(`OK: ${indexName}`);
    }
    await db.sequelize.close();
    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
