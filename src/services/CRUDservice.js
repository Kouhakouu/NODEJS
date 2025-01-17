// CRUDservice.js
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

        // If password is provided, hash it
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

// New method to delete teacher
let deleteTeacherData = async (teacherId) => {
    const transaction = await db.sequelize.transaction();
    try {
        let teacher = await db.Teacher.findByPk(teacherId, { transaction });
        if (!teacher) {
            throw new Error('Teacher does not exist!');
        }

        // If there are associations (e.g., ClassTeacher), handle them accordingly
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

        // Kiểm tra lịch học tồn tại
        const scheduleId = Number(classScheduleId);
        const schedule = await db.ClassSchedule.findByPk(scheduleId);
        if (!schedule) {
            throw new Error('Lịch học không tồn tại!');
        }

        // Tạo lớp với thông tin bao gồm class_schedule_id
        let newClass = await db.Class.create({
            className,
            gradeLevel,
            class_schedule_id: scheduleId, // Gán lịch học
        }, { transaction });

        // Gán giáo viên cho lớp nếu có teacherId
        if (teacherId) {
            await db.ClassTeacher.create({
                class_id: newClass.id,
                teacher_id: teacherId,
            }, { transaction });
        }

        await transaction.commit();
        return newClass; // Trả về đối tượng lớp mới tạo
    } catch (e) {
        await transaction.rollback();
        throw e; // Trả về lỗi
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

        // Kiểm tra xem lớp học tồn tại
        let existingClass = await db.Class.findByPk(classId, { transaction });
        if (!existingClass) {
            throw new Error('Lớp học không tồn tại!');
        }

        // Kiểm tra lịch học
        let schedule = await db.ClassSchedule.findByPk(classScheduleId, { transaction });
        if (!schedule) {
            throw new Error('Lịch học không tồn tại!');
        }

        // Cập nhật thông tin lớp học
        await existingClass.update({
            className: className,
            gradeLevel: gradeLevel,
            class_schedule_id: classScheduleId,
        }, { transaction });

        // Cập nhật giáo viên nếu cần
        let classTeacher = await db.ClassTeacher.findOne({
            where: { class_id: classId },
            transaction,
        });
        if (classTeacher) {
            await classTeacher.update({ teacher_id: teacherId }, { transaction });
        } else {
            // Nếu chưa có giáo viên, tạo mới
            await db.ClassTeacher.create({
                class_id: classId,
                teacher_id: teacherId,
            }, { transaction });
        }

        await transaction.commit();
        return existingClass; // Trả về lớp đã cập nhật
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
        console.log('Class Data:', cls); // Thêm dòng này để kiểm tra
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
        // Kiểm tra xem lớp học tồn tại
        let existingClass = await db.Class.findByPk(classId, { transaction });
        if (!existingClass) {
            throw new Error('Lớp học không tồn tại!');
        }

        // Xóa các liên kết với giáo viên trong ClassTeacher
        await db.ClassTeacher.destroy({
            where: { class_id: classId },
            transaction,
        });

        // Xóa lớp học
        await existingClass.destroy({ transaction });

        await transaction.commit();
        return 'Class deleted successfully!';
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

// Thêm hàm gán lớp cho trợ giảng sử dụng bảng liên kết
let assignClassToAssistant = async (assistantId, classId) => {
    const transaction = await db.sequelize.transaction();
    try {
        console.log(`Assigning classId: ${classId} to assistantId: ${assistantId}`);

        // Verify assistant exists
        let assistant = await db.Assistant.findByPk(assistantId, { transaction });
        if (!assistant) {
            throw new Error('Assistant does not exist!');
        }

        // Verify class exists
        let cls = await db.Class.findByPk(classId, { transaction });
        if (!cls) {
            throw new Error('Class does not exist!');
        }

        // Check if the relationship already exists
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

        // Create the association
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

        // Xóa các liên kết trong Class_Assistants
        await db.Class_Assistant.destroy({
            where: { assistantId: assistantId },
            transaction,
        });

        // Xóa trợ giảng
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
        // Check if the association exists
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

        // Remove the association
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

        // Nếu password được truyền lên, ta sẽ bcrypt nó
        let updatedData = {
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
        };

        if (data.password) {
            let hashPassword = await bcrypt.hash(data.password, salt);
            updatedData.password = hashPassword;
        }

        // Thực hiện update
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
        // Ở đây không cần hash password vì Student không có trường password (trong ví dụ này),
        // nhưng nếu có, bạn có thể triển khai như với Teacher, Manager, v.v.
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
    const transaction = await db.sequelize.transaction()
    try {
        // data gửi lên từ frontend: { id, fullName, DOB, school, parentPhoneNumber, parentEmail, classIds[] }
        const { id, fullName, DOB, school, parentPhoneNumber, parentEmail, classIds } = data

        // 1. Tìm học sinh
        let student = await db.Student.findByPk(id, { transaction })
        if (!student) {
            throw new Error('Student does not exist!')
        }

        // 2. Cập nhật thông tin
        await student.update({
            fullName,
            DOB,
            school,
            parentPhoneNumber,
            parentEmail
        }, { transaction })

        // 3. Cập nhật liên kết Student_Classes
        // 3.1. Xóa tất cả liên kết cũ
        await db.Student_Classes.destroy({
            where: { studentId: id },
            transaction
        })

        // 3.2. Tạo liên kết mới
        if (classIds && classIds.length > 0) {
            let newLinks = classIds.map(classId => ({
                studentId: id,
                classId: classId
            }))
            await db.Student_Classes.bulkCreate(newLinks, { transaction })
        }

        await transaction.commit()
        return student
    } catch (err) {
        await transaction.rollback()
        throw err
    }
}

let assignClassToStudent = async (studentId, classId) => {
    const transaction = await db.sequelize.transaction();
    try {
        // Kiểm tra sự tồn tại của học sinh
        let student = await db.Student.findByPk(studentId, { transaction });
        if (!student) {
            throw new Error('Student does not exist!');
        }

        // Kiểm tra sự tồn tại của lớp
        let cls = await db.Class.findByPk(classId, { transaction });
        if (!cls) {
            throw new Error('Class does not exist!');
        }

        // Kiểm tra xem mối quan hệ đã tồn tại chưa
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

        // Tạo liên kết
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

        // Xoá mọi liên kết với lớp trong Student_Classes
        await db.Student_Classes.destroy({
            where: { studentId },
            transaction,
        });

        // Xoá học sinh
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
    createClass: createClass, // Đổi tên này
    createNewSchedule: createNewSchedule,
    createNewManager: createNewManager,
    createNewAssistant: createNewAssistant,
    updateClassData: updateClassData,
    getAllClassSchedules: getAllClassSchedules,
    getClassById: getClassById,
    getAllClasses: getAllClasses,
    deleteClass: deleteClass,
    assignClassToAssistant: assignClassToAssistant, // Thêm vào đây
    createClassAssistant: createClassAssistant, // Thêm vào đây
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
