import bcrypt from 'bcryptjs';
import db from '../models/index';

const salt = bcrypt.genSaltSync(10);

let hashUserPassword = async (password) => {
    try {
        let hashPassword = await bcrypt.hash(password, salt);
        return hashPassword;
    } catch (e) {
        throw e;
    }
};

let createNewTeacher = async (data) => {
    try {
        let hashPasswordFromBcrypt = await hashUserPassword(data.password);
        const newTeacher = await db.Teacher.create({
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: hashPasswordFromBcrypt,
        });
        return newTeacher;
    } catch (e) {
        throw e;
    }
};

let updateTeacherData = async (teacherId, data) => {
    const transaction = await db.sequelize.transaction();
    try {
        let teacher = await db.Teacher.findByPk(teacherId, { transaction });
        if (!teacher) {
            throw new Error('Teacher does not exist!');
        }

        let updatedData = {
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
        };

        if (data.password) {
            let hashPassword = await bcrypt.hash(data.password, salt);
            updatedData.password = hashPassword;
        }

        await teacher.update(updatedData, { transaction });
        await transaction.commit();
        return teacher;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let deleteTeacherData = async (teacherId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let teacher = await db.Teacher.findByPk(teacherId, { transaction });
        if (!teacher) {
            throw new Error('Teacher does not exist!');
        }

        await db.ClassTeacher.destroy({
            where: { teacher_id: teacherId },
            transaction,
        });

        await teacher.destroy({ transaction });
        await transaction.commit();
        return;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let createClass = async (data) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { className, gradeLevel, classScheduleId, teacherId } = data;
        const scheduleId = Number(classScheduleId);
        const schedule = await db.ClassSchedule.findByPk(scheduleId);
        if (!schedule) {
            throw new Error('Lịch học không tồn tại!');
        }

        let newClass = await db.Class.create({
            className,
            gradeLevel,
            class_schedule_id: scheduleId,
        }, { transaction });

        if (teacherId) {
            await db.ClassTeacher.create({
                class_id: newClass.id,
                teacher_id: teacherId,
            }, { transaction });
        }

        await transaction.commit();
        return newClass;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let createNewSchedule = async (data) => {
    try {
        const newSchedule = await db.ClassSchedule.create({
            study_day: data.study_day,
            start_time: data.start_time,
            end_time: data.end_time,
        });
        return newSchedule;
    } catch (e) {
        throw e;
    }
};

let createNewManager = async (data) => {
    try {
        let hashPasswordFromBcrypt = await hashUserPassword(data.password);
        const newManager = await db.Manager.create({
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: hashPasswordFromBcrypt,
            gradeLevel: data.gradeLevel,
        });
        return newManager;
    } catch (e) {
        throw e;
    }
};

// Hàm cập nhật Manager
let updateManagerData = async (managerId, data) => {
    const transaction = await db.sequelize.transaction();
    try {
        let manager = await db.Manager.findByPk(managerId, { transaction });
        if (!manager) {
            throw new Error('Manager does not exist!');
        }

        let updatedData = {
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            gradeLevel: data.gradeLevel, // Vì Manager có thuộc tính gradeLevel
        };

        if (data.password) {
            let hashPassword = await bcrypt.hash(data.password, salt);
            updatedData.password = hashPassword;
        }

        await manager.update(updatedData, { transaction });
        await transaction.commit();
        return manager;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

// Hàm xóa Manager
let deleteManagerData = async (managerId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let manager = await db.Manager.findByPk(managerId, { transaction });
        if (!manager) {
            throw new Error('Manager does not exist!');
        }

        await manager.destroy({ transaction });
        await transaction.commit();
        return;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let createNewAssistant = async (data) => {
    try {
        let hashPasswordFromBcrypt = await hashUserPassword(data.password);
        const newAssistant = await db.Assistant.create({
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: hashPasswordFromBcrypt,
        });
        return newAssistant;
    } catch (e) {
        throw e;
    }
};

let updateClassData = async (data) => {
    const transaction = await db.sequelize.transaction();
    try {
        let classId = data.id;
        let className = data.className;
        let gradeLevel = data.gradeLevel;
        let classScheduleId = Number(data.classScheduleId);
        let teacherId = data.teacherId;

        let existingClass = await db.Class.findByPk(classId, { transaction });
        if (!existingClass) {
            throw new Error('Lớp học không tồn tại!');
        }

        let schedule = await db.ClassSchedule.findByPk(classScheduleId, { transaction });
        if (!schedule) {
            throw new Error('Lịch học không tồn tại!');
        }

        await existingClass.update({
            className: className,
            gradeLevel: gradeLevel,
            class_schedule_id: classScheduleId,
        }, { transaction });

        let classTeacher = await db.ClassTeacher.findOne({
            where: { class_id: classId },
            transaction,
        });
        if (classTeacher) {
            await classTeacher.update({ teacher_id: teacherId }, { transaction });
        } else {
            await db.ClassTeacher.create({
                class_id: classId,
                teacher_id: teacherId,
            }, { transaction });
        }

        await transaction.commit();
        return existingClass;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let getAllClassSchedules = async () => {
    try {
        let schedules = await db.ClassSchedule.findAll({
            attributes: ['id', 'study_day', 'start_time', 'end_time'],
        });
        return schedules;
    } catch (e) {
        throw e;
    }
};

let getClassById = async (id) => {
    try {
        let cls = await db.Class.findByPk(id, {
            attributes: ['id', 'className', 'gradeLevel', 'class_schedule_id'],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['id', 'study_day', 'start_time', 'end_time'],
                },
                {
                    model: db.ClassTeacher,
                    as: 'classTeacher',
                    attributes: ['teacher_id'],
                    include: [
                        {
                            model: db.Teacher,
                            as: 'teacher',
                            attributes: ['id', 'fullName', 'email', 'phoneNumber'],
                        },
                    ],
                },
            ],
        });
        console.log('Class Data:', cls);
        return cls;
    } catch (e) {
        throw e;
    }
};

let getAllClasses = async () => {
    try {
        let classes = await db.Class.findAll({
            attributes: ['id', 'className', 'gradeLevel', 'class_schedule_id'],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['id', 'study_day', 'start_time', 'end_time'],
                },
                {
                    model: db.ClassTeacher,
                    as: 'classTeacher',
                    attributes: ['teacher_id'],
                    include: [
                        {
                            model: db.Teacher,
                            as: 'teacher',
                            attributes: ['id', 'fullName', 'email', 'phoneNumber'],
                        },
                    ],
                },
            ],
        });
        return classes;
    } catch (e) {
        throw e;
    }
};

let deleteClass = async (classId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let existingClass = await db.Class.findByPk(classId, { transaction });
        if (!existingClass) {
            throw new Error('Lớp học không tồn tại!');
        }

        await db.ClassTeacher.destroy({
            where: { class_id: classId },
            transaction,
        });

        await existingClass.destroy({ transaction });
        await transaction.commit();
        return 'Class deleted successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let assignClassToAssistant = async (assistantId, classId) => {
    const transaction = await db.sequelize.transaction();
    try {
        console.log(`Assigning classId: ${classId} to assistantId: ${assistantId}`);
        let assistant = await db.Assistant.findByPk(assistantId, { transaction });
        if (!assistant) {
            throw new Error('Assistant does not exist!');
        }
        let cls = await db.Class.findByPk(classId, { transaction });
        if (!cls) {
            throw new Error('Class does not exist!');
        }
        let existingRelation = await db.Class_Assistant.findOne({
            where: {
                assistantId: assistantId,
                classId: classId,
            },
            transaction,
        });
        if (existingRelation) {
            throw new Error('Assistant is already assigned to this class!');
        }
        await db.Class_Assistant.create({
            assistantId,
            classId,
        }, { transaction });
        console.log('Class assigned successfully.');
        await transaction.commit();
        return 'Class assigned to assistant successfully!';
    } catch (e) {
        console.error('Error assigning class to assistant:', e);
        await transaction.rollback();
        throw e;
    }
};

let createClassAssistant = async (data) => {
    try {
        const { classId, assistantId } = data;
        return await assignClassToAssistant(assistantId, classId);
    } catch (e) {
        throw e;
    }
};

let deleteAssistant = async (assistantId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let assistant = await db.Assistant.findByPk(assistantId, { transaction });
        if (!assistant) {
            throw new Error('Trợ giảng không tồn tại!');
        }
        await db.Class_Assistant.destroy({
            where: { assistantId: assistantId },
            transaction,
        });
        await assistant.destroy({ transaction });
        await transaction.commit();
        return 'Assistant deleted successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let removeClassFromAssistant = async ({ classId, assistantId }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const association = await db.Class_Assistant.findOne({
            where: {
                classId: classId,
                assistantId: assistantId,
            },
            transaction,
        });
        if (!association) {
            throw new Error('Association does not exist.');
        }
        await association.destroy({ transaction });
        await transaction.commit();
        return 'Class removed from assistant successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let deleteClassAssistant = async (data) => {
    try {
        const { classId, assistantId } = data;
        return await removeClassFromAssistant({ classId, assistantId });
    } catch (e) {
        throw e;
    }
};

let updateAssistantData = async (assistantId, data) => {
    const transaction = await db.sequelize.transaction();
    try {
        let assistant = await db.Assistant.findByPk(assistantId, { transaction });
        if (!assistant) {
            throw new Error('Assistant does not exist!');
        }
        let updatedData = {
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
        };
        if (data.password) {
            let hashPassword = await bcrypt.hash(data.password, salt);
            updatedData.password = hashPassword;
        }
        await assistant.update(updatedData, { transaction });
        await transaction.commit();
        return assistant;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let createNewStudent = async (data) => {
    try {
        const newStudent = await db.Student.create({
            fullName: data.fullName,
            DOB: data.DOB,
            school: data.school,
            parentPhoneNumber: data.parentPhoneNumber,
            parentEmail: data.parentEmail,
        });
        return newStudent;
    } catch (e) {
        throw e;
    }
};

let updateStudent = async (data) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id, fullName, DOB, school, parentPhoneNumber, parentEmail, classIds } = data;
        let student = await db.Student.findByPk(id, { transaction });
        if (!student) {
            throw new Error('Student does not exist!');
        }
        await student.update({
            fullName,
            DOB,
            school,
            parentPhoneNumber,
            parentEmail
        }, { transaction });
        await db.Student_Classes.destroy({
            where: { studentId: id },
            transaction
        });
        if (classIds && classIds.length > 0) {
            let newLinks = classIds.map(classId => ({
                studentId: id,
                classId: classId
            }));
            await db.Student_Classes.bulkCreate(newLinks, { transaction });
        }
        await transaction.commit();
        return student;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

let assignClassToStudent = async (studentId, classId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let student = await db.Student.findByPk(studentId, { transaction });
        if (!student) {
            throw new Error('Student does not exist!');
        }
        let cls = await db.Class.findByPk(classId, { transaction });
        if (!cls) {
            throw new Error('Class does not exist!');
        }
        let existingRelation = await db.Student_Classes.findOne({
            where: {
                studentId: studentId,
                classId: classId,
            },
            transaction,
        });
        if (existingRelation) {
            throw new Error('Student is already assigned to this class!');
        }
        await db.Student_Classes.create({
            studentId,
            classId,
        }, { transaction });
        await transaction.commit();
        return 'Class assigned to student successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let createClassStudent = async (data) => {
    try {
        const { classId, studentId } = data;
        return await assignClassToStudent(studentId, classId);
    } catch (e) {
        throw e;
    }
};

let removeClassFromStudent = async ({ classId, studentId }) => {
    const transaction = await db.sequelize.transaction();
    try {
        let association = await db.Student_Classes.findOne({
            where: { classId, studentId },
            transaction,
        });
        if (!association) {
            throw new Error('Association does not exist.');
        }
        await association.destroy({ transaction });
        await transaction.commit();
        return 'Class removed from student successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

let deleteClassStudent = async (data) => {
    try {
        const { classId, studentId } = data;
        return await removeClassFromStudent({ classId, studentId });
    } catch (e) {
        throw e;
    }
};

let deleteStudent = async (studentId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let student = await db.Student.findByPk(studentId, { transaction });
        if (!student) {
            throw new Error('Student does not exist!');
        }
        await db.Student_Classes.destroy({
            where: { studentId },
            transaction,
        });
        await student.destroy({ transaction });
        await transaction.commit();
        return 'Student deleted successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

module.exports = {
    createNewTeacher: createNewTeacher,
    createClass: createClass,
    createNewSchedule: createNewSchedule,
    createNewManager: createNewManager,
    updateManagerData: updateManagerData,
    deleteManagerData: deleteManagerData,
    createNewAssistant: createNewAssistant,
    updateClassData: updateClassData,
    getAllClassSchedules: getAllClassSchedules,
    getClassById: getClassById,
    getAllClasses: getAllClasses,
    deleteClass: deleteClass,
    assignClassToAssistant: assignClassToAssistant,
    createClassAssistant: createClassAssistant,
    deleteAssistant: deleteAssistant,
    deleteClassAssistant: deleteClassAssistant,
    updateAssistantData: updateAssistantData,
    createNewStudent: createNewStudent,
    updateStudent: updateStudent,
    createClassStudent: createClassStudent,
    deleteClassStudent: deleteClassStudent,
    deleteStudent: deleteStudent,
    updateTeacherData: updateTeacherData,
    deleteTeacherData: deleteTeacherData,
};
