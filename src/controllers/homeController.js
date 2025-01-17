// homeController.js

import db from '../models/index'
import CRUDservice from '../services/CRUDservice'

let getHomePage = async (req, res) => {
    try {
        return res.render('homepage.ejs')
    } catch (e) {
        console.log(e)
        res.status(500).send('Internal Server Error');
    }
}

let getTeacherCRUD = (req, res) => {
    return res.render('teacher-crud.ejs')
}

let getClassCRUD = async (req, res) => {
    try {
        let classes = await CRUDservice.getAllClasses()
        const teachers = await db.Teacher.findAll();
        const classSchedules = await db.ClassSchedule.findAll();
        return res.render('class-crud.ejs', {
            classes: classes,
            teachers: teachers,
            classSchedules: classSchedules
        })
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

let getScheduleCRUD = (req, res) => {
    return res.render('schedule-crud.ejs')
}

let getManagerCRUD = (req, res) => {
    return res.render('manager-crud.ejs')
}

let getAssistantCRUD = (req, res) => {
    return res.render('assistant-crud.ejs')
}

let postTeacherCRUD = async (req, res) => {
    try {
        let message = await CRUDservice.createNewTeacher(req.body);
        res.status(200).send(message);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating teacher');
    }
}

let postClassCRUD = async (req, res) => {
    try {
        let message = await CRUDservice.createClass(req.body);
        res.status(200).send(message);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message || 'Error creating class');
    }
}

let postScheduleCRUD = async (req, res) => {
    try {
        let message = await CRUDservice.createNewSchedule(req.body);
        res.status(200).send(message);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message || 'Error creating class');
    }
}

let postManagerCRUD = async (req, res) => {
    try {
        let message = await CRUDservice.createNewManager(req.body);
        res.status(200).send(message);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating manager');
    }
}

let postAssistantCRUD = async (req, res) => {
    try {
        let message = await CRUDservice.createNewAssistant(req.body);
        res.status(200).send(message);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating assistant');
    }
}

let getClassUpdateCRUD = async (req, res) => {
    let classId = req.params.id
    if (classId) {
        let classData = await CRUDservice.getClassById(classId)
        let schedules = await db.ClassSchedule.findAll()
        let teachers = await db.Teacher.findAll()
        return res.render('class-update.ejs', {
            data: classData,
            schedules: schedules,
            teachers: teachers
        })
    } else {
        return res.send('Class not found!')
    }
}

let postClassUpdateCRUD = async (req, res) => {
    let data = req.body
    try {
        let message = await CRUDservice.updateClassData(data)
        return res.redirect('/class-crud')
    } catch (e) {
        console.error(e)
        return res.status(500).send('Error while updating class')
    }
}

let postClassDeleteCRUD = async (req, res) => {
    let classId = req.body.id
    if (!classId) {
        return res.status(400).send('Class ID is required')
    }
    try {
        let message = await CRUDservice.deleteClass(classId)
        console.log(message)
        return res.redirect('/class-crud')
    } catch (e) {
        console.error(e)
        return res.status(500).send('Error while deleting class')
    }
}

module.exports = {
    getHomePage: getHomePage,
    getTeacherCRUD: getTeacherCRUD,
    postTeacherCRUD: postTeacherCRUD,
    getClassCRUD: getClassCRUD,
    postClassCRUD: postClassCRUD,
    getManagerCRUD: getManagerCRUD,
    postManagerCRUD: postManagerCRUD,
    getAssistantCRUD: getAssistantCRUD,
    postAssistantCRUD: postAssistantCRUD,
    getScheduleCRUD: getScheduleCRUD,
    postScheduleCRUD: postScheduleCRUD,
    getClassUpdateCRUD: getClassUpdateCRUD,
    postClassUpdateCRUD: postClassUpdateCRUD,
    postClassDeleteCRUD: postClassDeleteCRUD
}
