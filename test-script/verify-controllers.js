// Seed dữ liệu test -> gọi trực tiếp các controller đã tối ưu -> dọn sạch.
// Chạy: npx babel-node test-script/verify-controllers.js (từ thư mục NODEJS)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/models');

const teacherController = require('../src/controllers/teacherController');
const managerController = require('../src/controllers/managerController');
const assistantController = require('../src/controllers/assistantController');
const studentController = require('../src/controllers/studentController');
const adminController = require('../src/controllers/adminController');
const profileController = require('../src/controllers/profileController');

function mockRes() {
    const r = { statusCode: 200, body: null };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
}

async function call(name, fn, req, summarize) {
    const res = mockRes();
    try {
        await fn(req, res);
        const summary = summarize ? summarize(res.body) : '';
        const flag = res.statusCode === 200 ? 'OK ' : 'WARN';
        console.log(`[${flag}] ${name} -> ${res.statusCode} ${summary}`);
        if (res.statusCode !== 200) console.log('       body:', JSON.stringify(res.body));
    } catch (e) {
        console.log(`[FAIL] ${name} -> threw: ${e.message}`);
    }
}

async function main() {
    const created = {};
    try {
        // ===== SEED =====
        const roles = await db.Role.findAll();
        const roleId = (name) => roles.find(r => r.roleName === name).roleId;

        const mkUser = async (email, role) =>
            db.User.create({ email, password: 'x', roleId: roleId(role) });

        const teacherUser = await mkUser('test_opt_teacher@example.com', 'TEACHER');
        created.teacherUser = teacherUser.userId;
        await db.Teacher.create({ userId: teacherUser.userId, fullName: 'TEST_OPT Teacher', phoneNumber: '0' });

        const managerUser = await mkUser('test_opt_manager@example.com', 'MANAGER');
        created.managerUser = managerUser.userId;
        await db.Manager.create({ userId: managerUser.userId, fullName: 'TEST_OPT Manager', phoneNumber: '0', gradeLevel: '9' });

        const assistantUser = await mkUser('test_opt_assistant@example.com', 'ASSISTANT');
        created.assistantUser = assistantUser.userId;
        await db.Assistant.create({ userId: assistantUser.userId, fullName: 'TEST_OPT Assistant', phoneNumber: '0', status: 1 });

        const studentUser = await mkUser('test_opt_student@example.com', 'STUDENT');
        created.studentUser = studentUser.userId;

        const schedule = await db.ClassSchedule.create({ study_day: 'Thứ 7', start_time: '08:00', end_time: '10:00' });
        created.schedule = schedule.id;

        const cls = await db.Class.create({ className: 'TEST_OPT_9X', gradeLevel: '9', class_schedule_id: schedule.id });
        created.class = cls.id;

        await db.ClassTeacher.create({ class_id: cls.id, teacher_id: teacherUser.userId });
        await db.Class_Assistant.create({ classId: cls.id, assistantId: assistantUser.userId });

        const s1 = await db.Student.create({ userId: studentUser.userId, fullName: 'TEST_OPT HS1', DOB: '2010-01-01', school: 'X', parentEmail: 'p1@example.com' });
        const s2 = await db.Student.create({ fullName: 'TEST_OPT HS2', DOB: '2010-02-02', school: 'Y', parentEmail: 'p2@example.com' });
        created.students = [s1.id, s2.id];
        await db.Student_Classes.bulkCreate([
            { studentId: s1.id, classId: cls.id },
            { studentId: s2.id, classId: cls.id },
        ]);

        const l1 = await db.Lesson.create({ lessonContent: 'Buổi 1', lessonDate: '2026-06-01', homeworkList: 'B1,B2,B3' });
        const l2 = await db.Lesson.create({ lessonContent: 'Buổi 2', lessonDate: '2026-06-08', homeworkList: 'B4,B5' });
        created.lessons = [l1.id, l2.id];
        await db.LessonClass.bulkCreate([
            { lessonId: l1.id, classId: cls.id },
            { lessonId: l2.id, classId: cls.id },
        ]);
        await db.LessonStudent.bulkCreate([
            { lessonId: l1.id, studentId: s1.id, attendance: true },
            { lessonId: l1.id, studentId: s2.id, attendance: false },
            { lessonId: l2.id, studentId: s1.id, attendance: true },
            { lessonId: l2.id, studentId: s2.id, attendance: true },
        ]);

        const mkPerf = async (lessonId, studentId, doneTask, totalScore) => {
            const p = await db.StudentPerformance.create({
                doneTask, totalScore,
                incorrectTasks: 'B2', missingTasks: '',
                presentation: 'Tốt', skills: 'Khá', comment: 'TEST_OPT'
            });
            await db.StudentPerformanceLesson.create({ studentPerformanceId: p.id, lessonId });
            await db.StudentPerformanceStudent.create({ studentPerformanceId: p.id, studentId });
            return p.id;
        };
        created.perfs = [
            await mkPerf(l1.id, s1.id, 3, 8),
            await mkPerf(l1.id, s2.id, 2, 6),
            await mkPerf(l2.id, s1.id, 2, 9),
        ];

        const course = await db.Course.create({ title: 'TEST_OPT Course', description: 'd', price: 0, teacherId: teacherUser.userId, isPublished: true });
        created.course = course.id;

        console.log('Seed xong:', JSON.stringify(created));
        console.log('--- Gọi các controller đã tối ưu ---');

        // ===== VERIFY =====
        await call('teacher.getTeacherClasses', teacherController.getTeacherClasses,
            { user: { userId: teacherUser.userId } },
            b => `classes=${b?.length} studentsCount=${b?.[0]?.studentsCount}`);

        await call('teacher.getClassStudents (N+1 fix)', teacherController.getClassStudents,
            { user: { userId: teacherUser.userId }, params: { id: String(cls.id) } },
            b => `sessions=${b?.sessions?.length} students=${b?.students?.length} ` +
                `hs1.perf=[${b?.students?.find(s => s.id === s1.id)?.performance?.map(p => `${p.doneCount}/${p.correctCount}`).join(',')}]`);

        await call('manager.getManagerClasses', managerController.getManagerClasses,
            { user: { userId: managerUser.userId } },
            b => `classes=${b?.length} studentsCount=${b?.[0]?.studentsCount}`);

        await call('manager.getManagerDashboardStats (raw SQL fix)', managerController.getManagerDashboardStats,
            { user: { userId: managerUser.userId } },
            b => `summary=${JSON.stringify(b?.summary)} scoreData=${JSON.stringify(b?.scoreData)}`);

        await call('manager.getLessonDetail', managerController.getLessonDetail,
            { params: { classId: String(cls.id), lessonId: String(l2.id) } },
            b => `prevContent="${b?.previousLessonContent}" prevHw=${b?.previousHomeworkCount}`);

        await call('assistant.getAssistantClasses', assistantController.getAssistantClasses,
            { user: { userId: assistantUser.userId } },
            b => `classes=${b?.length} students=${b?.[0]?.studentsCount} lessons=${b?.[0]?.assignmentsCount}`);

        await call('assistant.getLessonStudentsPerformance', assistantController.getLessonStudentsPerformance,
            { params: { id: String(cls.id), lessonId: String(l1.id) } },
            b => `students=${b?.length} perf1=${JSON.stringify(b?.[0]?.performance)} att2=${b?.[1]?.attendance}`);

        await call('student.getStudentClasses', studentController.getStudentClasses,
            { user: { userId: studentUser.userId } },
            b => `classes=${b?.length} lessonsCount=${b?.[0]?.lessonsCount}`);

        await call('student.getStudentClassDetail', studentController.getStudentClassDetail,
            { user: { userId: studentUser.userId }, params: { id: String(cls.id) } },
            b => `lessons=${b?.lessons?.length} l1.att=${b?.lessons?.[0]?.attendance} l1.perf.score=${b?.lessons?.[0]?.performance?.totalScore}`);

        await call('admin.getAdminStats', adminController.getAdminStats,
            {},
            b => `users=${JSON.stringify(b?.userCounts)} class0=${JSON.stringify(b?.classSummaries?.[0] && { s: b.classSummaries[0].studentsCount, l: b.classSummaries[0].lessonsCount })}`);

        await call('profile.getProfile (STUDENT)', profileController.getProfile,
            { user: { userId: studentUser.userId, role: 'STUDENT' } },
            b => `fullName=${b?.fullName} school=${b?.school}`);

        await call('profile.getProfile (MANAGER)', profileController.getProfile,
            { user: { userId: managerUser.userId, role: 'MANAGER' } },
            b => `fullName=${b?.fullName} grade=${b?.gradeLevel}`);

    } finally {
        // ===== CLEANUP (xóa đúng những gì đã tạo) =====
        console.log('--- Cleanup ---');
        const Op = db.Sequelize.Op;
        try {
            if (created.perfs?.length) {
                await db.StudentPerformanceLesson.destroy({ where: { studentPerformanceId: { [Op.in]: created.perfs } } });
                await db.StudentPerformanceStudent.destroy({ where: { studentPerformanceId: { [Op.in]: created.perfs } } });
                await db.StudentPerformance.destroy({ where: { id: { [Op.in]: created.perfs } } });
            }
            if (created.lessons?.length) {
                await db.LessonStudent.destroy({ where: { lessonId: { [Op.in]: created.lessons } } });
                await db.LessonClass.destroy({ where: { lessonId: { [Op.in]: created.lessons } } });
                await db.Lesson.destroy({ where: { id: { [Op.in]: created.lessons } } });
            }
            if (created.class) {
                await db.Student_Classes.destroy({ where: { classId: created.class } });
                await db.Class_Assistant.destroy({ where: { classId: created.class } });
                await db.ClassTeacher.destroy({ where: { class_id: created.class } });
            }
            if (created.students?.length) await db.Student.destroy({ where: { id: { [Op.in]: created.students } } });
            if (created.course) await db.Course.destroy({ where: { id: created.course } });
            if (created.class) await db.Class.destroy({ where: { id: created.class } });
            if (created.schedule) await db.ClassSchedule.destroy({ where: { id: created.schedule } });
            const userIds = [created.teacherUser, created.managerUser, created.assistantUser, created.studentUser].filter(Boolean);
            if (userIds.length) {
                await db.Teacher.destroy({ where: { userId: { [Op.in]: userIds } } });
                await db.Manager.destroy({ where: { userId: { [Op.in]: userIds } } });
                await db.Assistant.destroy({ where: { userId: { [Op.in]: userIds } } });
                await db.User.destroy({ where: { userId: { [Op.in]: userIds } } });
            }
            console.log('Cleanup xong.');
        } catch (e) {
            console.error('CLEANUP ERROR (cần dọn tay):', e.message, JSON.stringify(created));
        }
        await db.sequelize.close();
    }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
