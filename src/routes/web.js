import express from "express";
import homeController from "../controllers/homeController";
import teacherController from "../controllers/teacherController";
import classController from "../controllers/classController";
import managerController from "../controllers/managerController";
import assistantController from "../controllers/assistantController";
import scheduleController from "../controllers/scheduleController";
import studentController from "../controllers/studentController";
import courseController from "../controllers/courseController";
import profileController from "../controllers/profileController";
import adminController from "../controllers/adminController";
import documentController from "../controllers/documentController";
import { authMiddleware, requireRole } from "../services/authMiddleware";

let router = express.Router();

// Middleware ghép sẵn theo vai trò
const adminOnly = [authMiddleware, requireRole('ADMIN')];
const adminOrManager = [authMiddleware, requireRole('ADMIN', 'MANAGER')];
const teacherOnly = [authMiddleware, requireRole('TEACHER')];
const assistantOnly = [authMiddleware, requireRole('ASSISTANT')];
const assistantOrManager = [authMiddleware, requireRole('ASSISTANT', 'MANAGER')];
const managerOnly = [authMiddleware, requireRole('MANAGER')];
const studentOnly = [authMiddleware, requireRole('STUDENT')];

let initWebRoutes = (app) => {
    router.get("/", homeController.getHomePage);

    // Trang EJS legacy (admin cũ) — đã khóa ADMIN; browser thường không gửi được
    // Bearer token nên các trang này chỉ còn truy cập được qua công cụ có header.
    // UI admin chính thức là app React (REACTJS).
    router.get("/teacher-crud", adminOnly, homeController.getTeacherCRUD);
    router.get("/class-crud", adminOnly, homeController.getClassCRUD);
    router.get("/schedule-crud", adminOnly, homeController.getScheduleCRUD);
    router.get("/manager-crud", adminOnly, homeController.getManagerCRUD);
    router.get("/assistant-crud", adminOnly, homeController.getAssistantCRUD);

    // CRUD nhân sự / lớp / lịch — chỉ ADMIN (trừ phần MANAGER cần cho gán trợ giảng)
    router.post("/teacher-post-crud", adminOnly, teacherController.createTeacher);
    router.post("/class-post-crud", adminOnly, classController.createClass);
    router.post("/manager-post-crud", adminOnly, managerController.createManager);
    router.post("/assistant-post-crud", adminOrManager, assistantController.createAssistant);
    router.post("/schedule-post-crud", adminOnly, homeController.postScheduleCRUD);

    router.get("/get-teacher-info", adminOnly, teacherController.getTeacherInfo);
    router.get("/get-class-info", adminOrManager, classController.getClassInfo);
    router.get("/get-class-schedule-info", adminOnly, classController.getClassScheduleInfo);
    router.get("/get-manager-info", adminOnly, managerController.getManagerInfo);
    router.get("/get-assistant-info", adminOrManager, assistantController.getAssistantInfo);

    router.put("/class-update-crud/:id", adminOnly, classController.updateClass);
    router.post("/class-update-crud", adminOnly, homeController.postClassUpdateCRUD);
    router.delete("/class-delete-crud/:id", adminOnly, classController.deleteClass);
    router.post("/class-assistant-post-crud", adminOrManager, assistantController.postClassAssistantCRUD);
    router.post("/delete-class-assistant-crud", adminOrManager, assistantController.postDeleteClassAssistantCRUD);
    router.post("/assistant-delete-crud", adminOnly, assistantController.postAssistantDeleteCRUD);
    router.put("/assistant-update-crud/:id", adminOnly, assistantController.updateAssistant);

    router.get("/get-schedules", adminOnly, scheduleController.getSchedules);
    router.post("/create-schedule", adminOnly, scheduleController.createSchedule);
    router.put("/edit-schedule/:id", adminOnly, scheduleController.editSchedule);
    router.delete("/delete-schedule/:id", adminOnly, scheduleController.deleteSchedule);

    router.put("/teacher-update-crud/:id", adminOnly, teacherController.updateTeacher);
    router.delete("/teacher-delete-crud/:id", adminOnly, teacherController.deleteTeacher);
    router.put("/manager-update-crud/:id", adminOnly, managerController.updateManager);
    router.delete("/manager-delete-crud/:id", adminOnly, managerController.deleteManager);

    router.get("/get-student-info", adminOnly, studentController.getStudentInfo);
    router.post("/student-post-crud", adminOnly, studentController.postStudentCRUD);
    router.post("/class-student-post-crud", adminOnly, studentController.postClassStudentCRUD);
    router.post("/delete-class-student-crud", adminOnly, studentController.postDeleteClassStudentCRUD);
    router.post("/student-delete-crud", adminOnly, studentController.postStudentDeleteCRUD);
    router.put("/update-student-crud", adminOnly, studentController.putStudentCRUD);

    //trang giáo viên
    router.get("/get-teacher-courses", teacherOnly, teacherController.getTeacherCourses);
    router.post("/create-course", teacherOnly, teacherController.createCourse);
    router.get('/teacher/classes', teacherOnly, teacherController.getTeacherClasses);
    router.get('/teacher/classes/:id', teacherOnly, teacherController.getClassStudents);

    //tài liệu giáo viên
    router.get('/teacher/documents', teacherOnly, documentController.getDocuments);
    router.post('/teacher/documents', teacherOnly, documentController.upload.single('file'), documentController.uploadDocument);
    router.delete('/teacher/documents/:id', teacherOnly, documentController.deleteDocument);

    //trang trợ giảng
    router.get('/assistant/classes', assistantOnly, assistantController.getAssistantClasses);
    router.get('/assistant/classes/:id', assistantOnly, assistantController.getClassStudentDetail);
    router.get('/assistant/classes/:id/lessons', assistantOnly, assistantController.getAssistantLessons);
    router.get('/assistant/classes/:id/lessons/:lessonId/students-performance', assistantOnly, assistantController.getLessonStudentsPerformance);
    router.post(
        '/assistant/classes/:classId/lessons/:lessonId/students-performance',
        assistantOnly, assistantController.postSaveStudentPerformance
    );
    router.get('/lessons/:lessonId/homeworklist', assistantOrManager, assistantController.getLessonHomeworkList);
    router.post('/lessons/:lessonId/homeworklist', assistantOrManager, assistantController.updateLessonHomeworkList);
    router.put('/assistant/classes/:classId/lessons/:lessonId', assistantOnly, assistantController.updateLessonContent);
    router.get('/assistant/classes/:id/lessons/:lessonId', assistantOnly, assistantController.getLessonInfo);
    router.put('/assistant/lessons/:lessonId/students/:studentId/attendance', assistantOnly, assistantController.updateStudentAttendance);
    router.post('/assistant/classes/:classId/lessons/:lessonId/students/:studentId/ai-comment', assistantOnly, assistantController.generateAiCommentForStudent);
    router.post('/assistant/classes/:classId/lessons/:lessonId/ai-comment-all', assistantOnly, assistantController.generateAiCommentForLesson);
    router.post('/assistant/ai-comment', assistantOnly, assistantController.generateAiCommentStateless);

    //trang học sinh
    router.get('/student/classes', studentOnly, studentController.getStudentClasses);
    router.get('/student/classes/:id', studentOnly, studentController.getStudentClassDetail);

    //trang quản lý
    router.get('/manager/dashboard-stats', managerOnly, managerController.getManagerDashboardStats);
    router.get('/manager/classes', managerOnly, managerController.getManagerClasses);
    router.get('/manager/students/:id', managerOnly, assistantController.getClassStudentDetail);
    router.post('/createLesson', managerOnly, managerController.createLesson);
    router.get('/manager/classes/:id/lessons', managerOnly, assistantController.getAssistantLessons);
    router.get('/manager/classes/:id/lessons/:lessonId/students-performance', managerOnly, assistantController.getLessonStudentsPerformance);
    router.get('/students/:id', managerOnly, managerController.getClassStudents);
    router.put('/manager/lessons/:lessonId/students/:studentId/attendance', managerOnly, managerController.updateStudentAttendance);
    router.get('/manager/classes/:classId/lessons/:lessonId', managerOnly, managerController.getLessonDetail);
    router.put('/manager/lessons/:lessonId/lock', managerOnly, managerController.toggleLessonLock);
    router.post('/manager/classes/:classId/lessons/:lessonId/send-results-emails', managerOnly, managerController.sendLessonResultsEmails);
    // Quiz nội quy: trợ giảng mới (status=0) làm sau khi đăng nhập — chỉ cần đăng nhập, không khóa role
    router.post('/manager/quiz/submit', authMiddleware, managerController.submitQuizAnswers);

    //kích hoạt tài khoản trợ giảng (làm test -> nhận mã email -> nhập mã)
    router.post('/assistant/onboarding/request-code', assistantOnly, assistantController.requestVerificationCode);
    router.post('/assistant/onboarding/verify-code', assistantOnly, assistantController.verifyAssistantCode);

    // profile - tất cả role
    router.get('/profile', authMiddleware, profileController.getProfile);
    router.put('/profile', authMiddleware, profileController.updateProfile);
    router.put('/profile/password', authMiddleware, profileController.changePassword);

    // admin stats
    router.get('/admin/stats', adminOnly, adminController.getAdminStats);

    // khóa học - admin
    router.get('/admin/courses', adminOnly, courseController.getAllCourses);
    router.put('/admin/courses/:id', adminOnly, courseController.updateCourseVisibility);

    // khóa học - guest (public)
    router.get('/public/courses', courseController.getPublishedCourses);

    return app.use("/", router);
};

module.exports = initWebRoutes;
