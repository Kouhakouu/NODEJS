import express from "express";
import homeController from "../controllers/homeController";
import teacherController from "../controllers/teacherController";
import classController from "../controllers/classController";
import managerController from "../controllers/managerController";
import assistantController from "../controllers/assistantController";
import scheduleController from "../controllers/scheduleController";
import studentController from "../controllers/studentController";
import { authMiddleware } from "../services/authMiddleware";

let router = express.Router();

let initWebRoutes = (app) => {
    router.get("/", homeController.getHomePage);
    router.get("/teacher-crud", homeController.getTeacherCRUD);
    router.get("/class-crud", homeController.getClassCRUD);
    router.get("/schedule-crud", homeController.getScheduleCRUD);
    router.get("/manager-crud", homeController.getManagerCRUD);
    router.get("/assistant-crud", homeController.getAssistantCRUD);

    router.post("/teacher-post-crud", teacherController.createTeacher);
    router.post("/class-post-crud", classController.createClass);
    router.post("/manager-post-crud", managerController.createManager);
    router.post("/assistant-post-crud", assistantController.createAssistant);
    router.post("/schedule-post-crud", homeController.postScheduleCRUD);

    router.get("/get-teacher-info", teacherController.getTeacherInfo);
    router.get("/get-class-info", classController.getClassInfo);
    router.get("/get-class-schedule-info", classController.getClassScheduleInfo);
    router.get("/get-manager-info", managerController.getManagerInfo);
    router.get("/get-assistant-info", assistantController.getAssistantInfo);

    router.put("/class-update-crud/:id", classController.updateClass);
    router.post("/class-update-crud", homeController.postClassUpdateCRUD);
    router.delete("/class-delete-crud", classController.deleteClass);
    router.post("/class-assistant-post-crud", assistantController.postClassAssistantCRUD);
    router.post("/delete-class-assistant-crud", assistantController.postDeleteClassAssistantCRUD);
    router.post("/assistant-delete-crud", assistantController.postAssistantDeleteCRUD);
    router.put("/assistant-update-crud/:id", assistantController.updateAssistant);

    router.get("/get-schedules", scheduleController.getSchedules);
    router.post("/create-schedule", scheduleController.createSchedule);
    router.put("/edit-schedule/:id", scheduleController.editSchedule);
    router.delete("/delete-schedule/:id", scheduleController.deleteSchedule);

    router.put("/teacher-update-crud/:id", teacherController.updateTeacher);
    router.delete("/teacher-delete-crud/:id", teacherController.deleteTeacher);
    router.put("/manager-update-crud/:id", managerController.updateManager);
    router.delete("/manager-delete-crud/:id", managerController.deleteManager);

    router.get("/get-student-info", studentController.getStudentInfo);
    router.post("/student-post-crud", studentController.postStudentCRUD);
    router.post("/class-student-post-crud", studentController.postClassStudentCRUD);
    router.post("/delete-class-student-crud", studentController.postDeleteClassStudentCRUD);
    router.post("/student-delete-crud", studentController.postStudentDeleteCRUD);
    router.put("/update-student-crud", studentController.putStudentCRUD);

    //trang giáo viên
    router.get("/get-teacher-courses", authMiddleware, teacherController.getTeacherCourses);
    router.post("/create-course", authMiddleware, teacherController.createCourse);
    router.get('/teacher/classes', authMiddleware, teacherController.getTeacherClasses);
    router.get('/teacher/classes/:id', authMiddleware, teacherController.getClassStudents);

    //trang trợ giảng
    router.get('/assistant/classes', authMiddleware, assistantController.getAssistantClasses);
    router.get('/assistant/classes/:id', assistantController.getClassStudentDetail);
    router.get('/assistant/classes/:id/lessons', assistantController.getAssistantLessons);
    router.get('/assistant/classes/:id/lessons/:lessonId/students-performance', assistantController.getLessonStudentsPerformance);
    router.post(
        '/assistant/classes/:classId/lessons/:lessonId/students-performance',
        authMiddleware, assistantController.postSaveStudentPerformance
    );
    router.get('/lessons/:lessonId/homeworklist', assistantController.getLessonHomeworkList);
    router.post('/lessons/:lessonId/homeworklist', assistantController.updateLessonHomeworkList);
    router.put('/assistant/classes/:classId/lessons/:lessonId', authMiddleware, assistantController.updateLessonContent);
    router.get('/assistant/classes/:id/lessons/:lessonId', authMiddleware, assistantController.getLessonInfo);

    //trang quản lý
    router.get('/manager/classes', authMiddleware, managerController.getManagerClasses);
    router.get('/manager/students/:id', assistantController.getClassStudentDetail);
    router.post('/createLesson', managerController.createLesson);
    router.get('/manager/classes/:id/lessons', assistantController.getAssistantLessons);
    router.get('/manager/classes/:id/lessons/:lessonId/students-performance', assistantController.getLessonStudentsPerformance);
    router.get('/students/:id', authMiddleware, managerController.getClassStudents);

    return app.use("/", router);
};

module.exports = initWebRoutes;
