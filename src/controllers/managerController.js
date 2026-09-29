const bcrypt = require('bcrypt');
const db = require('../models');
const { safeStr, formatDateVN, jsonToText } = require("../utils/emailHelpers");
// Lazy-load để cold start không phải nạp nodemailer/handlebars khi request không gửi mail
const sendLessonResultEmailsBatch = (...args) => require("../services/emailService").sendLessonResultEmailsBatch(...args);
const sendQuizSubmissionEmail = (...args) => require("../services/emailService").sendQuizSubmissionEmail(...args);
const sendQuizResultEmail = (...args) => require("../services/emailService").sendQuizResultEmail(...args);

const getManagedClass = async (managerId, classId, options = {}) => {
    const manager = await db.Manager.findByPk(managerId, {
        attributes: ['gradeLevel'],
        transaction: options.transaction
    });
    if (!manager) {
        const error = new Error('Manager not found');
        error.statusCode = 404;
        throw error;
    }

    const classroom = await db.Class.findOne({
        where: { id: classId, gradeLevel: manager.gradeLevel },
        attributes: ['id', 'className', 'gradeLevel'],
        transaction: options.transaction
    });
    if (!classroom) {
        const error = new Error('Class not found in manager grade');
        error.statusCode = 404;
        throw error;
    }

    return { manager, classroom };
};

const sendControllerError = (res, error, fallbackMessage) => {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || fallbackMessage });
};

// Lấy thông tin tất cả các manager kèm email từ User
const getManagerInfo = async (req, res) => {
    try {
        const managers = await db.Manager.findAll({
            attributes: ['userId', 'fullName', 'phoneNumber', 'gradeLevel'],
            include: [{
                model: db.User,
                as: 'user',
                attributes: ['email']
            }]
        });

        const result = managers.map(m => ({
            userId: m.userId,
            fullName: m.fullName,
            phoneNumber: m.phoneNumber,
            gradeLevel: m.gradeLevel,
            email: m.user?.email || null
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('getManagerInfo error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Tạo mới Manager (User + Manager profile)
const createManager = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, gradeLevel } = req.body;
        if (!fullName || !email || !password || !gradeLevel) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await db.User.create({
            email,
            password: hashed,
            roleId: 3 // roleId của Manager
        });

        const manager = await db.Manager.create({
            userId: user.userId,
            fullName,
            phoneNumber,
            gradeLevel
        });

        return res.status(201).json({
            message: 'Tạo quản lý thành công!',
            manager: {
                userId: manager.userId,
                fullName: manager.fullName,
                phoneNumber: manager.phoneNumber,
                gradeLevel: manager.gradeLevel,
                email: user.email
            }
        });
    } catch (error) {
        console.error('createManager error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Cập nhật Manager và User kèm gradeLevel
const updateManager = async (req, res) => {
    try {
        const managerId = parseInt(req.params.id, 10);
        const { fullName, email, phoneNumber, password, gradeLevel } = req.body;

        const manager = await db.Manager.findByPk(managerId);
        if (!manager) return res.status(404).json({ message: 'Manager not found.' });

        const user = await db.User.findByPk(managerId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (email) user.email = email;
        if (password) user.password = await bcrypt.hash(password, 10);
        await user.save();

        if (fullName) manager.fullName = fullName;
        if (phoneNumber) manager.phoneNumber = phoneNumber;
        if (gradeLevel) manager.gradeLevel = gradeLevel;
        await manager.save();

        return res.status(200).json({
            message: 'Cập nhật quản lý thành công!',
            manager: {
                userId: manager.userId,
                fullName: manager.fullName,
                phoneNumber: manager.phoneNumber,
                gradeLevel: manager.gradeLevel,
                email: user.email
            }
        });
    } catch (error) {
        console.error('updateManager error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Xóa Manager (thực chất xóa User, cascade sẽ xóa Manager)
const deleteManager = async (req, res) => {
    try {
        const managerId = parseInt(req.params.id, 10);
        const deleted = await db.User.destroy({ where: { userId: managerId } });
        if (!deleted) return res.status(404).json({ message: 'Manager/User not found.' });
        return res.status(200).json({ message: 'Xóa quản lý thành công!' });
    } catch (error) {
        console.error('deleteManager error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Lấy danh sách lớp theo gradeLevel của Manager (trang quản lý)
const getManagerClasses = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const manager = await db.Manager.findByPk(managerId, {
            attributes: ['gradeLevel']
        });
        if (!manager) return res.status(404).json({ message: 'Manager not found' });

        const classes = await db.Class.findAll({
            where: { gradeLevel: manager.gradeLevel },
            attributes: [
                'id',
                'className',
                'gradeLevel',
                [db.sequelize.fn('COUNT', db.sequelize.col('students.id')), 'studentsCount'],
                'class_schedule_id'
            ],
            include: [
                {
                    model: db.ClassSchedule,
                    as: 'classSchedule',
                    attributes: ['id', 'study_day', 'start_time', 'end_time']
                },
                {
                    model: db.Student,
                    as: 'students',
                    attributes: [],
                    through: { attributes: [] }
                }
            ],
            group: [
                'Class.id',
                'Class.className',
                'Class.gradeLevel',
                'Class.class_schedule_id',
                'classSchedule.id',
                'classSchedule.study_day',
                'classSchedule.start_time',
                'classSchedule.end_time'
            ]
        });

        const result = classes.map(c => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            studentsCount: parseInt(c.get('studentsCount'), 10),
            classSchedule: c.classSchedule
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error('getManagerClasses error:', error);
        return res.status(500).json({ message: 'Error fetching manager classes' });
    }
};

// Tạo buổi học cho Manager
const createLesson = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { lessonDate, classId } = req.body;
        if (!lessonDate || !classId) {
            await t.rollback();
            return res.status(400).json({ message: 'lessonDate và classId là bắt buộc' });
        }

        const newLesson = await db.Lesson.create({
            lessonContent: '',
            totalTaskLength: '',
            lessonDate,
        }, { transaction: t });

        const newLessonClass = await db.LessonClass.create({
            lessonId: newLesson.id,
            classId
        }, { transaction: t });

        // Snapshot danh sách học sinh hiện tại của lớp vào Lesson_Students
        const studentLinks = await db.Student_Classes.findAll({
            where: { classId },
            attributes: ['studentId'],
            transaction: t
        });

        if (studentLinks.length > 0) {
            await db.LessonStudent.bulkCreate(
                studentLinks.map(s => ({
                    lessonId: newLesson.id,
                    studentId: s.studentId,
                    attendance: true
                })),
                { transaction: t }
            );
        }

        await t.commit();
        return res.status(201).json({
            message: 'Tạo mới buổi học thành công!',
            lesson: newLesson,
            lessonClass: newLessonClass
        });
    } catch (error) {
        await t.rollback();
        console.error('createLesson error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

// Xóa buổi học (dùng khi lỡ tạo nhầm) - DELETE /manager/classes/:classId/lessons/:lessonId
const deleteLesson = async (req, res) => {
    const classId = parseInt(req.params.classId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);
    if (!Number.isInteger(classId) || !Number.isInteger(lessonId)) {
        return res.status(400).json({ message: 'classId và lessonId không hợp lệ' });
    }

    const t = await db.sequelize.transaction();
    try {
        // Chỉ cho xóa buổi học thuộc đúng lớp được truyền vào
        const link = await db.LessonClass.findOne({ where: { lessonId, classId }, transaction: t });
        const lesson = link ? await db.Lesson.findByPk(lessonId, { transaction: t }) : null;
        if (!lesson) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy buổi học trong lớp này' });
        }

        if (lesson.isLocked) {
            await t.rollback();
            return res.status(409).json({ message: 'Buổi học đã được chốt kết quả. Hãy mở khóa trước khi xóa.' });
        }

        // Các bảng nối (Lesson_Classes, Lesson_Students, ...) tự xóa theo ON DELETE CASCADE,
        // nhưng bản ghi StudentPerformance thì không nên bị bỏ lại mồ côi.
        const performanceLinks = await db.StudentPerformanceLesson.findAll({
            where: { lessonId },
            attributes: ['studentPerformanceId'],
            transaction: t
        });
        const performanceIds = performanceLinks.map(p => p.studentPerformanceId);

        await lesson.destroy({ transaction: t });

        if (performanceIds.length > 0) {
            await db.StudentPerformance.destroy({ where: { id: performanceIds }, transaction: t });
        }

        await t.commit();
        return res.status(200).json({ message: 'Đã xóa buổi học' });
    } catch (error) {
        await t.rollback();
        console.error('deleteLesson error:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa buổi học' });
    }
};

// Chuẩn hoá họ tên để so khớp: bỏ khoảng trắng thừa, không phân biệt hoa thường
const normalizeStudentName = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();

// DOB trong DB là DATEONLY nên luôn quy về chuỗi 'YYYY-MM-DD' trước khi so khớp
const normalizeDOB = (dob) => {
    if (!dob) return '';
    if (typeof dob === 'string') {
        const trimmed = dob.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    }
    const parsed = new Date(dob);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const studentMatchKey = (name, dob) => `${normalizeStudentName(name)}|${normalizeDOB(dob)}`;

// Model Student validate isEmail nên email sai định dạng trong file phải bỏ đi thay vì làm hỏng cả import
const sanitizeStudentEmail = (email) => {
    const value = String(email || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
};

// Tạo buổi học từ danh sách học viên đọc trong file Excel (frontend đã parse sẵn thành JSON)
const createLessonFromExcel = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const classId = parseInt(req.params.classId, 10);
        const {
            lessonDate,
            lessonContent = '',
            homeworkList = '',
            students,
            syncClassRoster = true
        } = req.body;

        if (!classId || !lessonDate) {
            await t.rollback();
            return res.status(400).json({ message: 'classId và lessonDate là bắt buộc' });
        }
        if (!Array.isArray(students) || students.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Danh sách học sinh từ file Excel đang trống' });
        }

        const { classroom } = await getManagedClass(req.user.userId, classId, { transaction: t });

        // Chuẩn hoá + loại bỏ dòng trùng (cùng tên + ngày sinh) trong file
        const seenKeys = new Set();
        const skipped = [];
        const rows = [];
        students.forEach((raw, index) => {
            const fullName = String(raw?.fullName || '').trim().replace(/\s+/g, ' ');
            const DOB = normalizeDOB(raw?.DOB);

            if (!fullName) {
                skipped.push({ row: index + 1, fullName: '', reason: 'Thiếu họ tên học sinh' });
                return;
            }
            const key = studentMatchKey(fullName, DOB);
            if (seenKeys.has(key)) {
                skipped.push({ row: index + 1, fullName, reason: 'Trùng với một dòng khác trong file' });
                return;
            }
            seenKeys.add(key);

            rows.push({
                key,
                rowNumber: index + 1,
                fullName,
                DOB,
                school: String(raw?.school || '').trim() || null,
                parentEmail: sanitizeStudentEmail(raw?.parentEmail),
                parentPhoneNumber: String(raw?.parentPhoneNumber || '').trim() || null,
                studentCode: String(raw?.studentCode || '').trim() || null,
                studyStatus: String(raw?.studyStatus || '').trim() || null,
                attendance: raw?.attendance !== false
            });
        });

        if (rows.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Không có dòng học sinh hợp lệ trong file Excel', skipped });
        }

        // 1) Học sinh đang có trong lớp
        const classStudents = await db.Student.findAll({
            include: [{
                model: db.Class,
                as: 'classes',
                where: { id: classId },
                attributes: [],
                through: { attributes: [] }
            }],
            transaction: t
        });

        const byKey = new Map();
        const byName = new Map();
        const indexStudent = (student) => {
            byKey.set(studentMatchKey(student.fullName, student.DOB), student);
            const nameKey = normalizeStudentName(student.fullName);
            if (byName.has(nameKey)) {
                byName.set(nameKey, null); // trùng tên -> không dùng tên để so khớp nữa
            } else {
                byName.set(nameKey, student);
            }
        };
        classStudents.forEach(indexStudent);

        const classStudentIds = new Set(classStudents.map(student => student.id));

        const resolved = new Map(); // row.key -> { student, origin }
        const unresolvedRows = rows.filter((row) => {
            // Trong phạm vi một lớp, trùng họ tên gần như chắc chắn là cùng một học sinh
            // nên vẫn nhận nếu ngày sinh trong file lệch với hồ sơ đang lưu.
            const matched = byKey.get(row.key) || byName.get(normalizeStudentName(row.fullName));
            if (matched) {
                resolved.set(row.key, { student: matched, origin: 'class' });
                return false;
            }
            return true;
        });

        // 2) Học sinh đã có trong hệ thống nhưng chưa thuộc lớp này
        if (unresolvedRows.length > 0) {
            const dobList = [...new Set(unresolvedRows.map(r => r.DOB).filter(Boolean))];
            const nameList = [...new Set(unresolvedRows.map(r => r.fullName))];
            const orConditions = [];
            if (dobList.length > 0) orConditions.push({ DOB: { [db.Sequelize.Op.in]: dobList } });
            if (nameList.length > 0) orConditions.push({ fullName: { [db.Sequelize.Op.in]: nameList } });

            const candidates = orConditions.length > 0
                ? await db.Student.findAll({
                    where: { [db.Sequelize.Op.or]: orConditions },
                    transaction: t
                })
                : [];

            const globalByKey = new Map();
            candidates.forEach(student => {
                const key = studentMatchKey(student.fullName, student.DOB);
                if (!globalByKey.has(key)) globalByKey.set(key, student);
            });

            unresolvedRows.forEach(row => {
                const matched = globalByKey.get(row.key);
                if (matched) resolved.set(row.key, { student: matched, origin: 'system' });
            });
        }

        // 3) Học sinh hoàn toàn mới -> tạo mới (bắt buộc phải có ngày sinh vì DOB NOT NULL)
        const toCreate = [];
        rows.forEach(row => {
            if (resolved.has(row.key)) return;
            if (!row.DOB) {
                skipped.push({
                    row: row.rowNumber,
                    fullName: row.fullName,
                    reason: 'Học sinh mới nhưng thiếu ngày sinh nên không thể tạo hồ sơ'
                });
                return;
            }
            toCreate.push(row);
        });

        for (const row of toCreate) {
            const created = await db.Student.create({
                fullName: row.fullName,
                DOB: row.DOB,
                school: row.school,
                parentPhoneNumber: row.parentPhoneNumber,
                parentEmail: row.parentEmail
            }, { transaction: t });
            resolved.set(row.key, { student: created, origin: 'created' });
        }

        // Bổ sung thông tin còn trống cho học sinh đã có (không ghi đè dữ liệu cũ)
        for (const row of rows) {
            const entry = resolved.get(row.key);
            if (!entry || entry.origin === 'created') continue;
            const patch = {};
            if (!entry.student.school && row.school) patch.school = row.school;
            if (!entry.student.parentEmail && row.parentEmail) patch.parentEmail = row.parentEmail;
            if (!entry.student.parentPhoneNumber && row.parentPhoneNumber) patch.parentPhoneNumber = row.parentPhoneNumber;
            if (Object.keys(patch).length > 0) {
                await entry.student.update(patch, { transaction: t });
            }
        }

        const usableRows = rows.filter(row => resolved.has(row.key));
        if (usableRows.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Không thể xác định học sinh nào từ file Excel', skipped });
        }

        // 4) Đồng bộ sĩ số lớp
        // Bảng Student_Classes không có unique index nên phải tự lọc để tránh ghi trùng
        const newLinkStudentIds = [...new Set(
            usableRows
                .map(row => resolved.get(row.key).student.id)
                .filter(studentId => !classStudentIds.has(studentId))
        )];
        const newClassLinks = newLinkStudentIds.map(studentId => ({ classId, studentId }));

        if (syncClassRoster && newClassLinks.length > 0) {
            await db.Student_Classes.bulkCreate(newClassLinks, { transaction: t });
        }

        // 5) Tạo buổi học + snapshot điểm danh theo file Excel
        const newLesson = await db.Lesson.create({
            lessonContent: lessonContent || '',
            homeworkList: homeworkList || null,
            totalTaskLength: 0, // hook beforeSave tính lại theo homeworkList
            lessonDate
        }, { transaction: t });

        await db.LessonClass.create({
            lessonId: newLesson.id,
            classId
        }, { transaction: t });

        const lessonStudentRows = [];
        const seenStudentIds = new Set();
        usableRows.forEach(row => {
            const studentId = resolved.get(row.key).student.id;
            if (seenStudentIds.has(studentId)) return;
            seenStudentIds.add(studentId);
            lessonStudentRows.push({
                lessonId: newLesson.id,
                studentId,
                attendance: row.attendance
            });
        });

        if (lessonStudentRows.length > 0) {
            await db.LessonStudent.bulkCreate(lessonStudentRows, {
                ignoreDuplicates: true,
                transaction: t
            });
        }

        await t.commit();

        const summary = {
            totalRows: students.length,
            matchedInClass: [...resolved.values()].filter(e => e.origin === 'class').length,
            linkedFromSystem: [...resolved.values()].filter(e => e.origin === 'system').length,
            createdStudents: [...resolved.values()].filter(e => e.origin === 'created').length,
            addedToClass: syncClassRoster ? newClassLinks.length : 0,
            attendedCount: lessonStudentRows.filter(r => r.attendance).length,
            absentCount: lessonStudentRows.filter(r => !r.attendance).length,
            skipped
        };

        return res.status(201).json({
            message: `Đã tạo buổi học với ${lessonStudentRows.length} học sinh từ file Excel.`,
            lesson: newLesson,
            class: { id: classroom.id, className: classroom.className },
            summary
        });
    } catch (error) {
        await t.rollback();
        console.error('createLessonFromExcel error:', error);
        return sendControllerError(res, error, 'Không thể tạo buổi học từ file Excel');
    }
};

const getClassStudents = async (req, res) => {
    try {
        const classId = parseInt(req.params.id, 10);
        await getManagedClass(req.user.userId, classId);
        // Lấy lớp và include students qua quan hệ many-to-many
        const cls = await db.Class.findByPk(classId, {
            attributes: ['id', 'className'],
            include: [{
                model: db.Student,
                as: 'students',
                attributes: [
                    'id',
                    'fullName',
                    'DOB',
                    'school',
                    'parentPhoneNumber',
                    'parentEmail'
                ],
                through: { attributes: [] }
            }]
        });

        if (!cls) {
            return res.status(404).json({ message: 'Class not found' });
        }

        return res.status(200).json({
            id: cls.id,
            className: cls.className,
            students: cls.students
        });
    } catch (error) {
        console.error('getClassStudents error:', error);
        return sendControllerError(res, error, 'Internal server error');
    }
};

const getManagerAvailableStudents = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId, 10);
        if (!classId) {
            return res.status(400).json({ message: 'classId is required' });
        }

        await getManagedClass(req.user.userId, classId);

        const assignedRows = await db.Student_Classes.findAll({
            where: { classId },
            attributes: ['studentId']
        });
        const assignedStudentIds = assignedRows.map(row => row.studentId);
        const where = assignedStudentIds.length > 0
            ? { id: { [db.Sequelize.Op.notIn]: assignedStudentIds } }
            : {};

        const students = await db.Student.findAll({
            where,
            attributes: ['id', 'fullName', 'DOB', 'school', 'parentPhoneNumber', 'parentEmail'],
            include: [{
                model: db.Class,
                as: 'classes',
                attributes: ['id', 'className', 'gradeLevel'],
                through: { attributes: [] }
            }],
            order: [['fullName', 'ASC']]
        });

        return res.status(200).json(students);
    } catch (error) {
        console.error('getManagerAvailableStudents error:', error);
        return sendControllerError(res, error, 'Error fetching available students');
    }
};

const addManagerClassStudent = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const classId = parseInt(req.params.classId, 10);
        const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds : [req.body.studentId];
        const normalizedStudentIds = [...new Set(
            studentIds
                .map(id => parseInt(id, 10))
                .filter(id => Number.isInteger(id) && id > 0)
        )];

        if (!classId || normalizedStudentIds.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'classId and studentId/studentIds are required' });
        }

        const { classroom } = await getManagedClass(req.user.userId, classId, { transaction: t });

        const students = await db.Student.findAll({
            where: { id: { [db.Sequelize.Op.in]: normalizedStudentIds } },
            attributes: ['id'],
            transaction: t
        });
        if (students.length !== normalizedStudentIds.length) {
            await t.rollback();
            return res.status(404).json({ message: 'One or more students were not found' });
        }

        const existingLinks = await db.Student_Classes.findAll({
            where: {
                classId,
                studentId: { [db.Sequelize.Op.in]: normalizedStudentIds }
            },
            attributes: ['studentId'],
            transaction: t
        });
        const existingIds = new Set(existingLinks.map(link => link.studentId));
        const newStudentIds = normalizedStudentIds.filter(id => !existingIds.has(id));

        if (newStudentIds.length > 0) {
            await db.Student_Classes.bulkCreate(
                newStudentIds.map(studentId => ({ classId, studentId })),
                { transaction: t }
            );

            const openLessons = await db.Lesson.findAll({
                attributes: ['id'],
                where: { isLocked: false },
                include: [{
                    model: db.Class,
                    where: { id: classId },
                    attributes: [],
                    through: { attributes: [] }
                }],
                transaction: t
            });

            const lessonStudentRows = [];
            for (const lesson of openLessons) {
                for (const studentId of newStudentIds) {
                    lessonStudentRows.push({ lessonId: lesson.id, studentId, attendance: true });
                }
            }

            if (lessonStudentRows.length > 0) {
                await db.LessonStudent.bulkCreate(lessonStudentRows, {
                    ignoreDuplicates: true,
                    transaction: t
                });
            }
        }

        await t.commit();
        return res.status(200).json({
            message: 'Students added to class successfully',
            class: {
                id: classroom.id,
                className: classroom.className,
                gradeLevel: classroom.gradeLevel
            },
            addedStudentIds: newStudentIds,
            skippedStudentIds: [...existingIds]
        });
    } catch (error) {
        await t.rollback();
        console.error('addManagerClassStudent error:', error);
        return sendControllerError(res, error, 'Error adding students to class');
    }
};

const removeManagerClassStudent = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const classId = parseInt(req.params.classId, 10);
        const studentId = parseInt(req.params.studentId, 10);

        if (!classId || !studentId) {
            await t.rollback();
            return res.status(400).json({ message: 'classId and studentId are required' });
        }

        await getManagedClass(req.user.userId, classId, { transaction: t });

        const deleted = await db.Student_Classes.destroy({
            where: { classId, studentId },
            transaction: t
        });

        if (!deleted) {
            await t.rollback();
            return res.status(404).json({ message: 'Student is not assigned to this class' });
        }

        const openLessons = await db.Lesson.findAll({
            attributes: ['id'],
            where: { isLocked: false },
            include: [{
                model: db.Class,
                where: { id: classId },
                attributes: [],
                through: { attributes: [] }
            }],
            transaction: t
        });

        const openLessonIds = openLessons.map(lesson => lesson.id);
        if (openLessonIds.length > 0) {
            await db.LessonStudent.destroy({
                where: {
                    studentId,
                    lessonId: { [db.Sequelize.Op.in]: openLessonIds }
                },
                transaction: t
            });
        }

        await t.commit();
        return res.status(200).json({ message: 'Student removed from class successfully' });
    } catch (error) {
        await t.rollback();
        console.error('removeManagerClassStudent error:', error);
        return sendControllerError(res, error, 'Error removing student from class');
    }
};

//Điểm danh
const updateStudentAttendance = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const studentId = parseInt(req.params.studentId, 10);
        const { attendance } = req.body; // true/false

        // Dùng upsert giống như bên assistant để đảm bảo dữ liệu được cập nhật hoặc tạo mới
        await db.LessonStudent.upsert({
            lessonId: lessonId,
            studentId: studentId,
            attendance: attendance
        });

        return res.status(200).json({ message: 'Cập nhật điểm danh thành công' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật điểm danh' });
    }
};

// Buổi học liền trước (cùng lớp) của một buổi học
const findPreviousLesson = (classId, currentLesson, options = {}) => db.Lesson.findOne({
    include: [{
        model: db.Class,
        where: { id: classId },
        attributes: [],
        through: { attributes: [] }
    }],
    where: {
        lessonDate: {
            [db.Sequelize.Op.lt]: currentLesson.lessonDate
        }
    },
    order: [['lessonDate', 'DESC']],
    ...options
});

//Lấy thông tin buổi học
const getLessonDetail = async (req, res) => {
    try {
        const lessonId = parseInt(req.params.lessonId, 10);
        const classId = parseInt(req.params.classId, 10);

        const [classInfo, currentLesson] = await Promise.all([
            db.Class.findByPk(classId, { attributes: ['className'] }),
            db.Lesson.findByPk(lessonId)
        ]);

        if (!currentLesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const previousLesson = await findPreviousLesson(classId, currentLesson);

        const prevData = previousLesson ? {
            content: previousLesson.lessonContent,
        } : {
            content: 'Không có',
        };

        return res.status(200).json({
            id: currentLesson.id,
            className: classInfo ? classInfo.className : `Lớp ${classId}`,
            lessonContent: currentLesson.lessonContent,
            lessonDate: currentLesson.lessonDate,

            // BTVN tuần sau (văn bản tự do)
            nextHomework: currentLesson.nextHomework || '',

            // Tổng số BTVN của buổi hiện tại
            totalTaskLength: Number(currentLesson.totalTaskLength ?? 0),

            isLocked: Boolean(currentLesson.isLocked),

            // Nội dung buổi trước vẫn lấy từ buổi trước
            previousLessonContent: prevData.content,
            hasPreviousLesson: Boolean(previousLesson),

            // Đổi dòng này: Tổng số BTVN lấy theo bài hiện tại (hiện tại đang hotfix, tên biến bị sai nghĩa để frontend ko chỉnh nhiều)
            previousHomeworkCount: Number(currentLesson.totalTaskLength ?? 0)
        });

    } catch (error) {
        console.error('getLessonDetail error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Manager chỉnh sửa thông tin buổi học - PUT /manager/classes/:classId/lessons/:lessonId
// Body (mỗi trường đều tùy chọn): lessonContent, previousLessonContent, totalTaskLength, nextHomework
const updateLessonDetail = async (req, res) => {
    const classId = parseInt(req.params.classId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);
    if (!Number.isInteger(classId) || !Number.isInteger(lessonId)) {
        return res.status(400).json({ message: 'classId và lessonId không hợp lệ' });
    }

    const { lessonContent, previousLessonContent, totalTaskLength, nextHomework } = req.body || {};

    if (lessonContent !== undefined && typeof lessonContent !== 'string') {
        return res.status(400).json({ message: 'Nội dung bài học phải là văn bản.' });
    }
    if (previousLessonContent !== undefined && typeof previousLessonContent !== 'string') {
        return res.status(400).json({ message: 'Nội dung buổi trước phải là văn bản.' });
    }
    if (nextHomework !== undefined && typeof nextHomework !== 'string') {
        return res.status(400).json({ message: 'BTVN tuần sau phải là văn bản.' });
    }
    let taskCount;
    if (totalTaskLength !== undefined) {
        taskCount = Number(totalTaskLength);
        if (!Number.isInteger(taskCount) || taskCount < 0 || taskCount > 500) {
            return res.status(400).json({ message: 'Tổng số BTVN phải là số nguyên từ 0 đến 500.' });
        }
    }

    const t = await db.sequelize.transaction();
    try {
        const link = await db.LessonClass.findOne({ where: { lessonId, classId }, transaction: t });
        const lesson = link ? await db.Lesson.findByPk(lessonId, { transaction: t }) : null;
        if (!lesson) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy buổi học trong lớp này' });
        }

        if (lessonContent !== undefined) lesson.lessonContent = lessonContent.trim();
        if (nextHomework !== undefined) lesson.nextHomework = nextHomework.trim();

        if (taskCount !== undefined) {
            const tasks = (lesson.homeworkList || '')
                .split(',').map(s => s.trim()).filter(Boolean);
            if (tasks.length === 0) {
                // Chưa có danh sách bài tập: chỉ lưu tổng số (trợ giảng sẽ thấy "Bài 1..N")
                lesson.totalTaskLength = taskCount;
            } else {
                // Có danh sách bài tập: cắt bớt hoặc bổ sung "Bài k" cho khớp số lượng,
                // hook beforeSave sẽ tính lại totalTaskLength từ danh sách.
                const adjusted = tasks.slice(0, taskCount);
                for (let i = adjusted.length; i < taskCount; i++) adjusted.push(`Bài ${i + 1}`);
                lesson.homeworkList = adjusted.join(', ');
            }
        }
        await lesson.save({ transaction: t });

        if (previousLessonContent !== undefined) {
            const previousLesson = await findPreviousLesson(classId, lesson, { transaction: t });
            if (!previousLesson) {
                await t.rollback();
                return res.status(400).json({ message: 'Lớp chưa có buổi học trước để chỉnh sửa nội dung.' });
            }
            previousLesson.lessonContent = previousLessonContent.trim();
            await previousLesson.save({ transaction: t });
        }

        await t.commit();
        return res.status(200).json({
            message: 'Cập nhật thông tin buổi học thành công!',
            lessonContent: lesson.lessonContent,
            nextHomework: lesson.nextHomework || '',
            totalTaskLength: Number(lesson.totalTaskLength ?? 0)
        });
    } catch (error) {
        await t.rollback();
        console.error('updateLessonDetail error:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật buổi học' });
    }
};

//Chốt kết quả buổi học
const toggleLessonLock = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const lesson = await db.Lesson.findByPk(lessonId);

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // Đảo ngược trạng thái hiện tại (True -> False, False -> True)
        const newStatus = !lesson.isLocked;

        await lesson.update({ isLocked: newStatus });

        return res.status(200).json({
            message: newStatus ? 'Đã chốt kết quả buổi học' : 'Đã mở khóa buổi học',
            isLocked: newStatus
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// POST /manager/classes/:classId/lessons/:lessonId/send-results-emails?offset=0&limit=5
const sendLessonResultsEmails = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId, 10);
        const lessonId = parseInt(req.params.lessonId, 10);

        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);

        const [lesson, cls] = await Promise.all([
            db.Lesson.findByPk(lessonId),
            db.Class.findByPk(classId, { attributes: ["id", "className"] })
        ]);

        if (!lesson) return res.status(404).json({ message: "Lesson not found" });
        if (!cls) return res.status(404).json({ message: "Class not found" });

        if (!lesson.isLocked) {
            return res.status(400).json({
                message: "Buổi học chưa chốt, không thể gửi email.",
            });
        }

        const [lessonStudentRows, previousLesson, [perfRows]] = await Promise.all([
            db.LessonStudent.findAll({
                where: { lessonId },
                order: [["studentId", "ASC"]],
            }),

            db.Lesson.findOne({
                include: [{
                    model: db.Class,
                    where: { id: classId },
                    attributes: [],
                    through: { attributes: [] }
                }],
                where: {
                    lessonDate: { [db.Sequelize.Op.lt]: lesson.lessonDate }
                },
                order: [["lessonDate", "DESC"]],
            }),

            db.sequelize.query(
                `
                SELECT
                    sp.id,
                    sp."doneTask",
                    sp."totalScore",
                    sp."incorrectTasks",
                    sp."missingTasks",
                    sp.presentation,
                    sp.skills,
                    sp.comment,
                    sps."studentId"
                FROM "StudentPerformances" sp
                INNER JOIN "StudentPerformance_Lessons" spl
                    ON spl."studentPerformanceId" = sp.id
                INNER JOIN "StudentPerformance_Students" sps
                    ON sps."studentPerformanceId" = sp.id
                WHERE spl."lessonId" = :lessonId
                ORDER BY sp.id DESC
                `,
                { replacements: { lessonId } }
            )
        ]);

        const lessonStudentIds = lessonStudentRows.map(r => r.studentId);

        const allStudents = lessonStudentIds.length > 0
            ? await db.Student.findAll({
                where: { id: { [db.Sequelize.Op.in]: lessonStudentIds } },
                attributes: ["id", "fullName", "parentEmail"]
            })
            : [];

        const studentMap = new Map(allStudents.map(s => [s.id, s]));

        // Giữ thứ tự ổn định theo LessonStudent
        const orderedStudents = lessonStudentIds
            .map(id => studentMap.get(id))
            .filter(Boolean);

        const totalStudents = orderedStudents.length;

        // Chỉ lấy 1 batch nhỏ trong request này
        const batchStudents = orderedStudents.slice(offset, offset + limit);

        const previousLessonContent = previousLesson?.lessonContent || "Không có buổi học trước";

        const perfByStudentId = new Map();
        for (const row of perfRows) {
            if (!perfByStudentId.has(row.studentId)) {
                perfByStudentId.set(row.studentId, row);
            }
        }

        const subject = "[CMATH EDUCATION] ĐÁNH GIÁ KẾT QUẢ HỌC TẬP";

        let skippedNoEmail = 0;
        const mailItems = [];

        for (const s of batchStudents) {
            const to = s.parentEmail;

            if (!to) {
                skippedNoEmail++;
                continue;
            }

            const perf = perfByStudentId.get(s.id) || null;

            mailItems.push({
                to,
                subject,
                meta: { studentId: s.id, email: to },
                data: {
                    mail: to,
                    name: safeStr(s.fullName, "-"),
                    day: formatDateVN(lesson.lessonDate),
                    class: safeStr(cls.className, `Lớp ${classId}`),
                    content: safeStr(lesson.lessonContent, "Chưa cập nhật"),
                    comment: safeStr(perf?.comment, "-"),

                    previousContent: safeStr(previousLessonContent, "-"),
                    totalTaskLength: safeStr(lesson.totalTaskLength ?? 0, "0"),
                    doneTask: safeStr(perf?.doneTask, "N/A"),
                    totalScore: safeStr(perf?.totalScore, "N/A"),
                    inCorrectTasks: jsonToText(perf?.incorrectTasks),
                    missingTasks: jsonToText(perf?.missingTasks),
                    presentation: safeStr(perf?.presentation, "-"),
                    skills: safeStr(perf?.skills, "-"),
                },
            });
        }

        const sendResults = await sendLessonResultEmailsBatch(mailItems);

        let sent = 0;
        let failed = 0;
        const errors = [];

        sendResults.forEach((r, i) => {
            if (r.status === "fulfilled") {
                sent++;
            } else {
                failed++;
                errors.push({
                    ...mailItems[i].meta,
                    error: r.reason?.message || "unknown error"
                });
            }
        });

        const nextOffset = offset + limit;
        const hasMore = nextOffset < totalStudents;

        return res.status(200).json({
            message: "Đã xử lý một batch email.",
            batch: {
                offset,
                limit,
                processed: batchStudents.length,
                nextOffset,
                hasMore,
            },
            totalStudents,
            stats: {
                sent,
                failed,
                skippedNoEmail,
            },
            errors,
        });

    } catch (error) {
        console.error("sendLessonResultsEmails error:", error);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

//trợ giảng test nội quy
const QUIZ_ANSWER_KEY = {
    q1: "c",
    q2: "d",
    q3: "b",
    q4: "c",
    q5: "b",
    q6: "c",
    q7: "b",
    q8: "c",
    q9: "a",
    q10: "c",
    q11: "b",
    q12: "c",
    q13: "b",
    q14: "b",
    q15: "b",
    q16: "c",
    q17: "c",
    q18: "a",
    q19: "b",
    q20: "c",
    q21: "d",
    q22: "b",
    q23: "b",
};

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const submitQuizAnswers = async (req, res) => {
    try {
        const { fullName, contact, submittedAt, answers } = req.body || {};

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ message: "Invalid payload: answers is required." });
        }

        // 1) mail quản lý (fixed)
        const adminTo = process.env.QUIZ_TO_EMAIL;
        if (!adminTo) {
            return res.status(500).json({ message: "Missing QUIZ_TO_EMAIL in env." });
        }

        const subjectAdmin = process.env.QUIZ_SUBJECT || "[CMATH EDUCATION] Quiz nội quy - Submission";

        const submissionData = {
            fullName: safeStr(fullName, "-"),
            contact: safeStr(contact, "-"),
            submittedAt: safeStr(submittedAt, new Date().toISOString()),
            answers: answers.map((a, idx) => ({
                no: idx + 1,
                questionText: safeStr(a.questionText, ""),
                chosenOptionId: safeStr(a.chosenOptionId, ""),
                chosenOptionText: safeStr(a.chosenOptionText, ""),
            })),
        };

        // 2) chấm điểm trên server (answer key)
        const details = answers.map((a, idx) => {
            const qid = safeStr(a.questionId, "");
            const chosenId = safeStr(a.chosenOptionId, "");
            const correctOptionId = QUIZ_ANSWER_KEY[qid]; // undefined nếu qid sai
            const ok = Boolean(correctOptionId) && chosenId === correctOptionId;

            return {
                no: idx + 1,
                questionId: qid,
                questionText: safeStr(a.questionText, ""),
                chosenOptionId: chosenId,
                chosenOptionText: safeStr(a.chosenOptionText, ""),
                correctOptionId: correctOptionId || "?",
                isCorrect: ok,
            };
        });

        const totalCount = details.length;
        const correctCount = details.reduce((acc, d) => acc + (d.isCorrect ? 1 : 0), 0);
        const percent = totalCount ? Math.round((correctCount * 100) / totalCount) : 0;

        const wrongAnswers = details.filter((d) => !d.isCorrect);

        // 3) gửi mail cho user nếu contact là email
        const userEmail = isEmail(contact) ? contact : null;
        const subjectUser = process.env.QUIZ_RESULT_SUBJECT || "[CMATH EDUCATION] Kết quả Quiz nội quy";

        const resultData = {
            fullName: safeStr(fullName, "-"),
            submittedAt: safeStr(submittedAt, new Date().toISOString()),
            totalCount,
            correctCount,
            percent,
            hasWrong: wrongAnswers.length > 0,
            wrongAnswers,
        };

        // 4) send
        // - Luôn gửi admin
        // - Gửi user nếu có email hợp lệ
        const tasks = [
            sendQuizSubmissionEmail({ to: adminTo, subject: subjectAdmin, data: submissionData }),
        ];

        if (userEmail) {
            tasks.push(sendQuizResultEmail({ to: userEmail, subject: subjectUser, data: resultData }));
        }

        await Promise.all(tasks);

        return res.status(200).json({
            message: "Recorded",
            sentToUser: Boolean(userEmail),
        });
    } catch (error) {
        console.error("submitQuizAnswers error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const getManagerDashboardStats = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const manager = await db.Manager.findByPk(managerId, { attributes: ['gradeLevel'] });
        if (!manager) return res.status(404).json({ message: 'Manager not found' });

        const classes = await db.Class.findAll({
            where: { gradeLevel: manager.gradeLevel },
            attributes: ['id', 'className']
        });

        const empty = (classCount = 0, totalStudents = 0) => ({
            summary: { classCount, totalStudents, totalLessons: 0, overallAvgScore: null },
            classNames: classes.map(c => c.className),
            scoreData: [],
            attendanceData: []
        });

        if (classes.length === 0) return res.status(200).json(empty());

        const classIds = classes.map(c => c.id);

        // Lưu ý: Postgres fold identifier không quote về chữ thường nên mọi cột
        // camelCase và tên bảng đều phải đặt trong dấu nháy kép.
        const [[studentCountRows], [allLessonRows]] = await Promise.all([
            db.sequelize.query(
                `SELECT COUNT(DISTINCT "studentId") AS total FROM "Student_Classes" WHERE "classId" IN (:classIds)`,
                { replacements: { classIds } }
            ),
            // Lấy tất cả buổi học của các lớp, sắp xếp mới nhất trước
            db.sequelize.query(`
                SELECT lc."classId", l.id AS "lessonId", l."lessonDate"
                FROM "Lesson_Classes" lc
                JOIN "Lessons" l ON l.id = lc."lessonId"
                WHERE lc."classId" IN (:classIds)
                ORDER BY l."lessonDate" DESC
            `, { replacements: { classIds } })
        ]);
        const totalStudents = parseInt(studentCountRows[0]?.total) || 0;

        // Giữ lại 2 buổi học gần nhất của mỗi lớp
        const lessonsByClass = new Map();
        for (const row of allLessonRows) {
            if (!lessonsByClass.has(row.classId)) lessonsByClass.set(row.classId, []);
            const arr = lessonsByClass.get(row.classId);
            if (arr.length < 2) arr.push(row);
        }

        const targetLessonIds = [...lessonsByClass.values()].flat().map(r => r.lessonId);
        if (targetLessonIds.length === 0) return res.status(200).json(empty(classes.length, totalStudents));

        // Điểm danh + điểm trung bình theo buổi học và lớp (2 query độc lập, chạy song song)
        const [[attendanceRows], [scoreRows]] = await Promise.all([
            db.sequelize.query(`
                SELECT ls."lessonId", lc."classId",
                    COUNT(*) AS total,
                    SUM(CASE WHEN ls.attendance THEN 1.0 ELSE 0 END) AS present
                FROM "Lesson_Students" ls
                JOIN "Lesson_Classes" lc ON lc."lessonId" = ls."lessonId"
                WHERE ls."lessonId" IN (:lessonIds) AND lc."classId" IN (:classIds)
                GROUP BY ls."lessonId", lc."classId"
            `, { replacements: { lessonIds: targetLessonIds, classIds } }),
            db.sequelize.query(`
                SELECT spl."lessonId", lc."classId",
                    AVG(CAST(sp."totalScore" AS FLOAT)) AS "avgScore"
                FROM "StudentPerformance_Lessons" spl
                JOIN "StudentPerformances" sp ON sp.id = spl."studentPerformanceId"
                JOIN "Lesson_Classes" lc ON lc."lessonId" = spl."lessonId"
                WHERE spl."lessonId" IN (:lessonIds) AND lc."classId" IN (:classIds)
                GROUP BY spl."lessonId", lc."classId"
            `, { replacements: { lessonIds: targetLessonIds, classIds } })
        ]);

        const attendanceMap = new Map(
            attendanceRows.map(r => [`${r.classId}_${r.lessonId}`,
            r.total > 0 ? Math.round((r.present / r.total) * 100) : null
            ])
        );
        const scoreMap = new Map(
            scoreRows.map(r => [`${r.classId}_${r.lessonId}`,
            r.avgScore != null ? Math.round(parseFloat(r.avgScore) * 10) / 10 : null
            ])
        );

        // Tính ISO week và nhãn "dd/MM" (thứ Hai của tuần)
        const getWeekKey = (dateStr) => {
            const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
            const [y, m, d] = s.substring(0, 10).split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const thu = new Date(date);
            thu.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(thu.getFullYear(), 0, 4);
            const weekNum = 1 + Math.round(((thu.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
            const monday = new Date(date);
            monday.setDate(date.getDate() - (date.getDay() + 6) % 7);
            const label = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
            return { key: `${thu.getFullYear()}-${weekNum}`, label };
        };

        // Gán mỗi lessonId vào tuần tương ứng
        const lessonWeekMap = new Map();
        const weekLabelMap = new Map();
        for (const rows of lessonsByClass.values()) {
            for (const r of rows) {
                const { key, label } = getWeekKey(r.lessonDate);
                lessonWeekMap.set(r.lessonId, key);
                if (!weekLabelMap.has(key)) weekLabelMap.set(key, label);
            }
        }

        // Lấy 2 tuần gần nhất
        const last2WeekKeys = [...weekLabelMap.keys()].sort().slice(-2);

        const buildChartData = (dataMap) =>
            last2WeekKeys.map(weekKey => {
                const obj = { week: weekLabelMap.get(weekKey) };
                for (const cls of classes) {
                    const lesson = (lessonsByClass.get(cls.id) || [])
                        .find(l => lessonWeekMap.get(l.lessonId) === weekKey);
                    obj[cls.className] = lesson
                        ? (dataMap.get(`${cls.id}_${lesson.lessonId}`) ?? null)
                        : null;
                }
                return obj;
            });

        const allScores = scoreRows.map(r => parseFloat(r.avgScore)).filter(v => !isNaN(v));
        const overallAvgScore = allScores.length > 0
            ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10) / 10
            : null;

        return res.status(200).json({
            summary: { classCount: classes.length, totalStudents, totalLessons: targetLessonIds.length, overallAvgScore },
            classNames: classes.map(c => c.className),
            scoreData: buildChartData(scoreMap),
            attendanceData: buildChartData(attendanceMap)
        });
    } catch (error) {
        console.error('getManagerDashboardStats error:', error);
        return res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

module.exports = {
    getManagerInfo,
    createManager,
    updateManager,
    deleteManager,
    getManagerClasses,
    createLesson,
    deleteLesson,
    updateLessonDetail,
    createLessonFromExcel,
    getClassStudents,
    getManagerAvailableStudents,
    addManagerClassStudent,
    removeManagerClassStudent,
    updateStudentAttendance,
    getLessonDetail,
    toggleLessonLock,
    sendLessonResultsEmails,
    submitQuizAnswers,
    getManagerDashboardStats
};
