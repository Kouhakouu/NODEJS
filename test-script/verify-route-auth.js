// Test phân quyền route qua HTTP thật: không token -> 401, sai role -> 403, đúng role -> 200/404.
// Yêu cầu server đang chạy (npx babel-node src/server.js). Chạy: node test-script/verify-route-auth.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

const PORT = process.env.TEST_PORT || process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

const tokenFor = (role, userId = 999) =>
    jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '5m' });

// [tên, method, path, role gửi kèm (null = không token), các status chấp nhận]
// 404 chấp nhận được khi đúng role nhưng DB không có bản ghi -> chứng tỏ đã qua middleware.
const CASES = [
    ['public courses, no token', 'GET', '/public/courses', null, [200]],
    ['health, no token', 'GET', '/health', null, [200]],

    ['get-student-info, no token', 'GET', '/get-student-info', null, [401]],
    ['get-student-info, STUDENT', 'GET', '/get-student-info', 'STUDENT', [403]],
    ['get-student-info, ADMIN', 'GET', '/get-student-info', 'ADMIN', [200]],

    ['get-class-info, no token', 'GET', '/get-class-info', null, [401]],
    ['get-class-info, ASSISTANT', 'GET', '/get-class-info', 'ASSISTANT', [403]],
    ['get-class-info, MANAGER', 'GET', '/get-class-info', 'MANAGER', [200]],
    ['get-class-info, ADMIN', 'GET', '/get-class-info', 'ADMIN', [200]],

    ['create-schedule, no token', 'POST', '/create-schedule', null, [401]],
    ['create-schedule, TEACHER', 'POST', '/create-schedule', 'TEACHER', [403]],

    ['createLesson, no token', 'POST', '/createLesson', null, [401]],
    ['createLesson, STUDENT', 'POST', '/createLesson', 'STUDENT', [403]],
    ['createLesson, MANAGER (thiếu body)', 'POST', '/createLesson', 'MANAGER', [400]],

    ['lesson lock, no token', 'PUT', '/manager/lessons/1/lock', null, [401]],
    ['lesson lock, ASSISTANT', 'PUT', '/manager/lessons/1/lock', 'ASSISTANT', [403]],
    ['lesson lock, MANAGER', 'PUT', '/manager/lessons/1/lock', 'MANAGER', [404]],

    ['assistant classes, no token', 'GET', '/assistant/classes', null, [401]],
    ['assistant class detail, no token', 'GET', '/assistant/classes/1', null, [401]],
    ['assistant class detail, ASSISTANT', 'GET', '/assistant/classes/1', 'ASSISTANT', [404]],
    ['assistant attendance, no token', 'PUT', '/assistant/lessons/1/students/1/attendance', null, [401]],

    ['homeworklist, no token', 'GET', '/lessons/1/homeworklist', null, [401]],
    ['homeworklist, ASSISTANT', 'GET', '/lessons/1/homeworklist', 'ASSISTANT', [404]],
    ['homeworklist, MANAGER', 'GET', '/lessons/1/homeworklist', 'MANAGER', [404]],
    ['homeworklist, STUDENT', 'GET', '/lessons/1/homeworklist', 'STUDENT', [403]],

    ['admin stats, no token', 'GET', '/admin/stats', null, [401]],
    ['admin stats, MANAGER', 'GET', '/admin/stats', 'MANAGER', [403]],
    ['admin stats, ADMIN', 'GET', '/admin/stats', 'ADMIN', [200]],

    ['admin courses, no token', 'GET', '/admin/courses', null, [401]],
    ['teacher classes, STUDENT', 'GET', '/teacher/classes', 'STUDENT', [403]],
    ['student classes, TEACHER', 'GET', '/student/classes', 'TEACHER', [403]],
    ['student classes, STUDENT (không có hồ sơ)', 'GET', '/student/classes', 'STUDENT', [404]],

    ['quiz submit, no token', 'POST', '/manager/quiz/submit', null, [401]],
    ['quiz submit, ASSISTANT (body rỗng)', 'POST', '/manager/quiz/submit', 'ASSISTANT', [400]],

    ['EJS class-crud, no token', 'GET', '/class-crud', null, [401]],
];

async function main() {
    let pass = 0, fail = 0;
    for (const [name, method, path, role, expected] of CASES) {
        const headers = { 'Content-Type': 'application/json' };
        if (role) headers['Authorization'] = `Bearer ${tokenFor(role)}`;
        try {
            const res = await fetch(BASE + path, {
                method,
                headers,
                body: method === 'GET' ? undefined : JSON.stringify({}),
            });
            const ok = expected.includes(res.status);
            console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} -> ${res.status} (mong đợi ${expected.join('/')})`);
            ok ? pass++ : fail++;
        } catch (e) {
            console.log(`[FAIL] ${name} -> lỗi mạng: ${e.message}`);
            fail++;
        }
    }
    console.log(`\nKết quả: ${pass} pass, ${fail} fail`);
    process.exit(fail > 0 ? 1 : 0);
}

main();
