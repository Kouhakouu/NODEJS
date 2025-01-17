import express from "express"
import homeController from "../controllers/homeController"
import teacherController from "../controllers/teacherController"
import classController from "../controllers/classController"
import managerController from "../controllers/managerController"
import assistantController from "../controllers/assistantController"
import scheduleController from "../controllers/scheduleController"
import studentController from "../controllers/studentController"

let router = express.Router()

let initWebRoutes = (app) => {
    router.get('/', homeController.getHomePage)
    router.get('/teacher-crud', homeController.getTeacherCRUD)
    router.get('/class-crud', homeController.getClassCRUD)
    router.get('/schedule-crud', homeController.getScheduleCRUD)
    router.get('/manager-crud', homeController.getManagerCRUD)
    router.get('/assistant-crud', homeController.getAssistantCRUD)

    router.post('/teacher-post-crud', homeController.postTeacherCRUD)
    router.post('/class-post-crud', homeController.postClassCRUD)
    router.post('/manager-post-crud', homeController.postManagerCRUD)
    router.post('/assistant-post-crud', homeController.postAssistantCRUD)
    router.post('/schedule-post-crud', homeController.postScheduleCRUD)

    router.get('/get-teacher-info', teacherController.getTeacherInfo)
    router.get('/get-class-info', classController.getClassInfo)
    router.get('/get-class-schedule-info', classController.getClassScheduleInfo)
    router.get('/get-manager-info', managerController.getManagerInfo)
    router.get('/get-assistant-info', assistantController.getAssistantInfo)

    router.get('/class-update-crud/:id', homeController.getClassUpdateCRUD)
    router.post('/class-update-crud', homeController.postClassUpdateCRUD)
    router.post('/class-delete-crud', homeController.postClassDeleteCRUD)
    router.post('/class-assistant-post-crud', assistantController.postClassAssistantCRUD);
    router.post('/delete-class-assistant-crud', assistantController.postDeleteClassAssistantCRUD);
    router.post('/assistant-delete-crud', assistantController.postAssistantDeleteCRUD);
    router.put('/assistant-update-crud/:id', assistantController.updateAssistant);

    router.get('/get-schedules', scheduleController.getSchedules);
    router.post('/create-schedule', scheduleController.createSchedule);
    router.put('/edit-schedule/:id', scheduleController.editSchedule);
    router.delete('/delete-schedule/:id', scheduleController.deleteSchedule);
    router.put('/teacher-update-crud/:id', teacherController.updateTeacher);
    router.delete('/teacher-delete-crud/:id', teacherController.deleteTeacher);

    router.get('/get-student-info', studentController.getStudentInfo);
    router.post('/student-post-crud', studentController.postStudentCRUD);
    router.post('/class-student-post-crud', studentController.postClassStudentCRUD);
    router.post('/delete-class-student-crud', studentController.postDeleteClassStudentCRUD);
    router.post('/student-delete-crud', studentController.postStudentDeleteCRUD);
    router.put('/update-student-crud', studentController.putStudentCRUD)

    return app.use("/", router)
}

module.exports = initWebRoutes