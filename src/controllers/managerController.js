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

// Dấu thanh tiếng Việt (huyền, sắc, ngã, hỏi, nặng) ở dạng ký tự tổ hợp sau NFD
const VN_TONE_MARKS = /[̣̀́̃̉]/g;
const INVISIBLE_CHARS = /[​-‍﻿]/g;

// Họ tên để lưu/hiển thị: Unicode dựng sẵn, bỏ ký tự ẩn và khoảng trắng thừa
const cleanStudentName = (name) => String(name || '')
    .normalize('NFC')
    .replace(INVISIBLE_CHARS, '')
    .trim()
    .replace(/\s+/g, ' ');

// Chuẩn hoá họ tên để so khớp: không phân biệt hoa thường, Unicode dựng sẵn/tổ hợp
// và kiểu bỏ dấu cũ/mới ("Hoà" = "Hòa") bằng cách dời dấu thanh về cuối mỗi tiếng
const normalizeStudentName = (name) => String(name || '')
    .normalize('NFD')
    .replace(INVISIBLE_CHARS, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.replace(VN_TONE_MARKS, '') + (word.match(VN_TONE_MARKS) || []).join(''))
    .join(' ');

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

const DAY_MS = 24 * 60 * 60 * 1000;

const shiftDOB = (dob, days) => new Date(Date.parse(dob) + days * DAY_MS).toISOString().slice(0, 10);

// Các lần import trước lưu ngày sinh bị lùi 1 ngày (lỗi múi giờ khi đọc Excel ở frontend),
// nên khi trùng họ tên thì chấp nhận ngày sinh lệch tối đa 1 ngày
const isNearDOB = (a, b) => {
    const left = normalizeDOB(a);
    const right = normalizeDOB(b);
    if (!left || !right) return false;
    return Math.abs(Date.parse(left) - Date.parse(right)) <= DAY_MS;
};

// Chỉ nhận khi có đúng một học sinh trùng tên và ngày sinh gần khớp, tránh gán nhầm
const findUniqueNearMatch = (students, row) => {
    const matches = students.filter(student =>
        normalizeStudentName(student.fullName) === row.nameKey && isNearDOB(student.DOB, row.DOB)
    );
    return matches.length === 1 ? matches[0] : null;
};

// Model Student validate isEmail nên email sai định dạng trong file phải bỏ đi thay vì làm hỏng cả import
const sanitizeStudentEmail = (email) => {
    const value = String(email || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
};

// Trạng thái học trong file Excel ("Đang học", "Bảo lưu", "Chờ thanh toán"...) -> so khớp không dấu
const normalizeStudyStatus = (status) => String(status || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

// Chỉ học sinh "Đang học" mới được dùng khi import, các trạng thái khác bị bỏ qua
const isActiveStudyStatus = (status) => normalizeStudyStatus(status) === 'dang hoc';

const cleanText = (value) => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ');

// File Excel đôi khi nhập sai năm sinh (vd: học sinh lớp 7 sinh năm 2025).
// Ngày sinh phải từ 1990 trở đi và học sinh ít nhất 3 tuổi mới được dùng để tạo/cập nhật hồ sơ.
const MIN_STUDENT_AGE_YEARS = 3;
const isPlausibleDOB = (dob) => {
    const time = Date.parse(dob);
    if (Number.isNaN(time)) return false;
    const now = new Date();
    const latest = Date.UTC(now.getUTCFullYear() - MIN_STUDENT_AGE_YEARS, now.getUTCMonth(), now.getUTCDate());
    return time >= Date.UTC(1990, 0, 1) && time <= latest;
};

// Thông tin hồ sơ lấy theo file:
// - Trường học, email: theo đúng file, ô trống trong file thì xoá trắng trong hồ sơ.
//   Riêng email sai định dạng thì giữ email cũ (không coi là ô trống).
// - Ngày sinh: bắt buộc trong DB nên chỉ cập nhật khi file có ngày sinh hợp lệ.
const computeProfileChanges = (student, row) => {
    const changes = [];
    const currentDOB = normalizeDOB(student.DOB);
    if (row.DOB && !row.DOBWarning && row.DOB !== currentDOB) {
        changes.push({ field: 'DOB', label: 'Ngày sinh', from: currentDOB || null, to: row.DOB });
    }
    if ((row.school || null) !== (cleanText(student.school) || null)) {
        changes.push({ field: 'school', label: 'Trường học', from: student.school || null, to: row.school || null });
    }
    const currentEmail = String(student.parentEmail || '').trim().toLowerCase() || null;
    if (!row.emailWarning && (row.parentEmail || null) !== currentEmail) {
        changes.push({ field: 'parentEmail', label: 'Email phụ huynh', from: student.parentEmail || null, to: row.parentEmail || null });
    }
    // SĐT phụ huynh chỉ bổ sung khi hồ sơ đang trống (giữ hành vi cũ), không ghi đè
    if (row.parentPhoneNumber && !student.parentPhoneNumber) {
        changes.push({ field: 'parentPhoneNumber', label: 'SĐT phụ huynh', from: null, to: row.parentPhoneNumber });
    }
    return changes;
};

// Chuẩn hoá danh sách học sinh frontend gửi lên (đã parse từ Excel):
// bỏ học sinh không "Đang học", dòng thiếu tên và dòng trùng (cùng tên + ngày sinh)
const parseExcelStudentRows = (students) => {
    const seenKeys = new Set();
    const rows = [];
    const skipped = [];
    const inactive = [];

    students.forEach((raw, index) => {
        const rowNumber = Number.isInteger(raw?.rowNumber) ? raw.rowNumber : index + 1;
        const fullName = cleanStudentName(raw?.fullName);
        const studyStatus = String(raw?.studyStatus || '').trim();

        if (!fullName) {
            skipped.push({ rowNumber, fullName: '', reason: 'Thiếu họ tên học sinh' });
            return;
        }
        const DOB = normalizeDOB(raw?.DOB);
        if (!isActiveStudyStatus(studyStatus)) {
            inactive.push({ rowNumber, fullName, DOB, studyStatus: studyStatus || 'Không rõ' });
            return;
        }

        const key = studentMatchKey(fullName, DOB);
        if (seenKeys.has(key)) {
            skipped.push({ rowNumber, fullName, reason: 'Trùng với một dòng khác trong file' });
            return;
        }
        seenKeys.add(key);

        rows.push({
            key,
            nameKey: normalizeStudentName(fullName),
            rowNumber,
            fullName,
            DOB,
            DOBWarning: DOB && !isPlausibleDOB(DOB)
                ? `Ngày sinh trong file (${DOB.split('-').reverse().join('/')}) bất thường`
                : null,
            school: cleanText(raw?.school) || null,
            // Email không phân biệt hoa thường, lưu chữ thường cho thống nhất
            parentEmail: sanitizeStudentEmail(raw?.parentEmail)?.toLowerCase() || null,
            emailWarning: String(raw?.parentEmail || '').trim() && !sanitizeStudentEmail(raw?.parentEmail)
                ? `Email trong file (${String(raw.parentEmail).trim()}) sai định dạng nên không được dùng`
                : null,
            parentPhoneNumber: String(raw?.parentPhoneNumber || '').trim() || null
        });
    });

    return { rows, skipped, inactive };
};

const validateExcelStudentsPayload = (students) => {
    if (!Array.isArray(students) || students.length === 0) {
        const error = new Error('Danh sách học sinh từ file Excel đang trống');
        error.statusCode = 400;
        throw error;
    }
    const parsed = parseExcelStudentRows(students);
    if (parsed.rows.length === 0) {
        const error = new Error('File Excel không có học sinh nào ở trạng thái "Đang học"');
        error.statusCode = 400;
        throw error;
    }
    return parsed;
};

const findClassStudents = (classId, transaction) => db.Student.findAll({
    attributes: ['id', 'fullName', 'DOB', 'school', 'parentEmail', 'parentPhoneNumber'],
    include: [{
        model: db.Class,
        as: 'classes',
        where: { id: classId },
        attributes: [],
        through: { attributes: [] }
    }],
    order: [['fullName', 'ASC']],
    transaction
});

// So khớp các dòng trong file với học sinh đang có trong lớp
const matchRowsInClass = (rows, classStudents) => {
    const byKey = new Map();
    const byName = new Map();
    classStudents.forEach(student => {
        byKey.set(studentMatchKey(student.fullName, student.DOB), student);
        const nameKey = normalizeStudentName(student.fullName);
        // Trùng tên trong lớp -> không dùng riêng tên để so khớp nữa
        byName.set(nameKey, byName.has(nameKey) ? null : student);
    });

    const matched = new Map(); // row.key -> student
    const unmatchedRows = [];
    rows.forEach(row => {
        // Trong phạm vi một lớp, trùng họ tên gần như chắc chắn là cùng một học sinh
        // nên vẫn nhận nếu ngày sinh trong file lệch với hồ sơ đang lưu.
        const student = byKey.get(row.key)
            || byName.get(row.nameKey)
            || findUniqueNearMatch(classStudents, row);
        if (student) {
            matched.set(row.key, student);
        } else {
            unmatchedRows.push(row);
        }
    });

    return { matched, unmatchedRows };
};

const toStudentSummary = (student) => ({
    id: student.id,
    fullName: student.fullName,
    DOB: normalizeDOB(student.DOB)
});

// Chế độ "Tạo buổi học": chỉ đọc danh sách lớp, không tạo/sửa hồ sơ học sinh và không đổi sĩ số.
// Mọi học sinh trong lớp đều có mặt trong buổi học; ai "Đang học" trong file thì có mặt, còn lại vắng.
const buildLessonImportPlan = async (classId, rows, transaction) => {
    const classStudents = await findClassStudents(classId, transaction);
    const { matched, unmatchedRows } = matchRowsInClass(rows, classStudents);

    const presentIds = new Set([...matched.values()].map(student => student.id));
    const roster = classStudents.map(student => ({
        ...toStudentSummary(student),
        attendance: presentIds.has(student.id)
    }));

    return {
        classStudents,
        roster,
        presentIds,
        matchedRows: rows
            .filter(row => matched.has(row.key))
            .map(row => ({
                rowNumber: row.rowNumber,
                fullName: row.fullName,
                DOB: row.DOB,
                student: toStudentSummary(matched.get(row.key))
            })),
        notInClass: unmatchedRows.map(row => ({ rowNumber: row.rowNumber, fullName: row.fullName, DOB: row.DOB }))
    };
};

// Tạo buổi học từ file Excel danh sách học viên (frontend đã parse sẵn thành JSON).
// dryRun = true: chỉ trả về bản xem trước, không ghi gì vào DB.
const createLessonFromExcel = async (req, res) => {
    let t = null;
    try {
        const classId = parseInt(req.params.classId, 10);
        const {
            lessonDate,
            lessonContent = '',
            homeworkList = '',
            students,
            dryRun = false
        } = req.body;

        if (!classId) {
            return res.status(400).json({ message: 'classId không hợp lệ' });
        }
        if (!dryRun && !lessonDate) {
            return res.status(400).json({ message: 'lessonDate là bắt buộc' });
        }

        const { rows, skipped, inactive } = validateExcelStudentsPayload(students);

        if (!dryRun) t = await db.sequelize.transaction();
        const { classroom } = await getManagedClass(req.user.userId, classId, { transaction: t });
        const plan = await buildLessonImportPlan(classId, rows, t);

        const summary = {
            totalRows: students.length,
            activeRows: rows.length,
            inactiveCount: inactive.length,
            classSize: plan.roster.length,
            presentCount: plan.presentIds.size,
            absentCount: plan.roster.length - plan.presentIds.size,
            notInClassCount: plan.notInClass.length,
            skippedCount: skipped.length
        };
        const preview = {
            class: { id: classroom.id, className: classroom.className },
            summary,
            roster: plan.roster,
            matchedRows: plan.matchedRows,
            notInClass: plan.notInClass,
            inactive,
            skipped
        };

        if (dryRun) {
            return res.status(200).json(preview);
        }

        if (plan.presentIds.size === 0) {
            await t.rollback();
            return res.status(400).json({
                message: 'Không có học sinh nào trong file khớp với danh sách lớp. Hãy kiểm tra lại file hoặc lớp đang chọn.',
                ...preview
            });
        }

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

        // Giống tạo buổi học thường: snapshot toàn bộ sĩ số lớp vào Lesson_Students,
        // để trợ giảng chấm bài và quản lý gửi mail cho đủ học sinh của lớp
        if (plan.roster.length > 0) {
            await db.LessonStudent.bulkCreate(
                plan.roster.map(student => ({
                    lessonId: newLesson.id,
                    studentId: student.id,
                    attendance: student.attendance
                })),
                { ignoreDuplicates: true, transaction: t }
            );
        }

        await t.commit();

        return res.status(201).json({
            message: `Đã tạo buổi học: ${summary.presentCount} có mặt, ${summary.absentCount} vắng.`,
            lesson: newLesson,
            ...preview
        });
    } catch (error) {
        if (t) await t.rollback();
        console.error('createLessonFromExcel error:', error);
        return sendControllerError(res, error, 'Không thể tạo buổi học từ file Excel');
    }
};

// Chế độ "Cập nhật danh sách lớp": xác định từng dòng trong file sẽ được xử lý thế nào.
// action: 'inClass' (đã trong lớp) | 'link' (hồ sơ có sẵn, thêm vào lớp) | 'create' (tạo hồ sơ mới) | 'skip'
// toRemove: học sinh của lớp không khớp dòng "Đang học" nào trong file
const buildRosterImportPlan = async (classId, rows, inactive, transaction) => {
    const classStudents = await findClassStudents(classId, transaction);
    const { matched, unmatchedRows } = matchRowsInClass(rows, classStudents);

    const systemMatched = new Map(); // row.key -> student đã có trong hệ thống nhưng chưa thuộc lớp
    const nameOnlyKeys = new Set(); // các dòng khớp chỉ theo họ tên (file thiếu ngày sinh)
    if (unmatchedRows.length > 0) {
        // Lấy cả ngày sinh ±1 ngày để bắt được hồ sơ bị lưu lệch ngày từ các lần import trước
        const dobList = [...new Set(
            unmatchedRows
                .filter(r => r.DOB)
                .flatMap(r => [shiftDOB(r.DOB, -1), r.DOB, shiftDOB(r.DOB, 1)])
        )];
        // Postgres so sánh chuỗi chính xác từng byte nên gửi cả dạng dựng sẵn lẫn tổ hợp
        const nameList = [...new Set(
            unmatchedRows.flatMap(r => [r.fullName, r.fullName.normalize('NFD')])
        )];
        const orConditions = [{ fullName: { [db.Sequelize.Op.in]: nameList } }];
        if (dobList.length > 0) orConditions.push({ DOB: { [db.Sequelize.Op.in]: dobList } });

        const candidates = await db.Student.findAll({
            where: { [db.Sequelize.Op.or]: orConditions },
            include: [{
                model: db.Class,
                as: 'classes',
                attributes: ['id', 'className'],
                through: { attributes: [] },
                required: false
            }],
            transaction
        });

        const globalByKey = new Map();
        candidates.forEach(student => {
            const key = studentMatchKey(student.fullName, student.DOB);
            if (!globalByKey.has(key)) globalByKey.set(key, student);
        });

        unmatchedRows.forEach(row => {
            let student = globalByKey.get(row.key) || findUniqueNearMatch(candidates, row);
            // File hay để trống ngày sinh: nhận theo họ tên nếu cả hệ thống chỉ có đúng một hồ sơ trùng tên
            if (!student && !row.DOB) {
                const sameName = candidates.filter(c => normalizeStudentName(c.fullName) === row.nameKey);
                if (sameName.length === 1) {
                    student = sameName[0];
                    nameOnlyKeys.add(row.key);
                }
            }
            if (student) systemMatched.set(row.key, student);
        });
    }

    const rowWarnings = (row) => [
        row.DOBWarning && `${row.DOBWarning}, giữ nguyên ngày sinh cũ`,
        row.emailWarning
    ].filter(Boolean);

    const entries = rows.map(row => {
        const base = {
            row,
            rowNumber: row.rowNumber,
            fullName: row.fullName,
            DOB: row.DOB,
            dobInvalid: !!row.DOBWarning,
            warnings: [],
            changes: []
        };
        if (matched.has(row.key)) {
            return { ...base, action: 'inClass', student: matched.get(row.key), warnings: rowWarnings(row) };
        }
        if (systemMatched.has(row.key)) {
            return {
                ...base,
                action: 'link',
                student: systemMatched.get(row.key),
                warnings: [
                    nameOnlyKeys.has(row.key) && 'Khớp chỉ theo họ tên vì file thiếu ngày sinh, hãy kiểm tra lại',
                    ...rowWarnings(row)
                ].filter(Boolean)
            };
        }
        if (!row.DOB) {
            return { ...base, action: 'skip', reason: 'Học sinh mới nhưng thiếu ngày sinh nên không thể tạo hồ sơ' };
        }
        if (row.DOBWarning) {
            return { ...base, action: 'skip', reason: 'Học sinh mới nhưng ngày sinh bất thường, hãy sửa lại file' };
        }
        return { ...base, action: 'create', warnings: [row.emailWarning].filter(Boolean) };
    });

    // Hai dòng khác nhau trong file có thể cùng khớp một hồ sơ -> chỉ xử lý dòng đầu tiên,
    // tránh thêm vào lớp hai lần hoặc cập nhật hồ sơ bằng hai bộ thông tin khác nhau
    const seenStudentIds = new Set();
    entries.forEach(entry => {
        if (entry.action !== 'inClass' && entry.action !== 'link') return;
        if (seenStudentIds.has(entry.student.id)) {
            entry.action = 'skip';
            entry.reason = 'Trùng hồ sơ với một dòng khác trong file';
            return;
        }
        seenStudentIds.add(entry.student.id);
        entry.changes = computeProfileChanges(entry.student, entry.row);
    });

    // Danh sách lớp lấy theo file: học sinh của lớp không khớp dòng "Đang học" nào sẽ bị xoá khỏi lớp.
    // Đối chiếu thêm với các dòng "Bảo lưu"/"Chờ thanh toán"... chỉ để ghi rõ lý do xoá.
    const { matched: inactiveMatched } = matchRowsInClass(
        inactive.map(r => ({ ...r, key: studentMatchKey(r.fullName, r.DOB), nameKey: normalizeStudentName(r.fullName) })),
        classStudents
    );
    const inactiveByStudentId = new Map();
    inactive.forEach(r => {
        const student = inactiveMatched.get(studentMatchKey(r.fullName, r.DOB));
        if (student && !inactiveByStudentId.has(student.id)) inactiveByStudentId.set(student.id, r);
    });

    const inFileIds = new Set(entries.filter(e => e.action === 'inClass').map(e => e.student.id));
    const toRemove = classStudents
        .filter(student => !inFileIds.has(student.id))
        .map(student => {
            const inactiveRow = inactiveByStudentId.get(student.id);
            return {
                ...toStudentSummary(student),
                reason: inactiveRow
                    ? `Trạng thái "${inactiveRow.studyStatus}" trong file (dòng ${inactiveRow.rowNumber})`
                    : 'Không có trong file'
            };
        });

    return { entries, toRemove, classSize: classStudents.length };
};

const toRosterPreviewEntry = (entry) => ({
    rowNumber: entry.rowNumber,
    fullName: entry.fullName,
    DOB: entry.DOB,
    action: entry.action,
    reason: entry.reason,
    dobInvalid: entry.dobInvalid,
    warnings: entry.warnings,
    changes: entry.changes,
    student: entry.student ? {
        ...toStudentSummary(entry.student),
        classes: (entry.student.classes || []).map(c => ({ id: c.id, className: c.className }))
    } : null
});

const findOpenLessonIds = async (classId, transaction) => {
    const openLessons = await db.Lesson.findAll({
        attributes: ['id'],
        where: { isLocked: false },
        include: [{
            model: db.Class,
            where: { id: classId },
            attributes: [],
            through: { attributes: [] }
        }],
        transaction
    });
    return openLessons.map(lesson => lesson.id);
};

// Cập nhật danh sách lớp theo file Excel: lớp chỉ còn đúng các học sinh "Đang học" trong file.
// - Thêm học sinh chưa có trong lớp (dùng hồ sơ có sẵn hoặc tạo mới)
// - Cập nhật ngày sinh / trường / email theo file
// - Xoá khỏi lớp học sinh không có trong file hoặc không "Đang học" (hồ sơ vẫn giữ),
//   trừ các học sinh quản lý chọn giữ lại (keepStudentIds)
// dryRun = true: chỉ trả về bản xem trước.
const importClassStudentsFromExcel = async (req, res) => {
    let t = null;
    try {
        const classId = parseInt(req.params.classId, 10);
        const { students, dryRun = false, keepStudentIds = [], excludeRowNumbers = [] } = req.body;
        if (!classId) {
            return res.status(400).json({ message: 'classId không hợp lệ' });
        }

        const { rows, skipped, inactive } = validateExcelStudentsPayload(students);

        if (!dryRun) t = await db.sequelize.transaction();
        const { classroom } = await getManagedClass(req.user.userId, classId, { transaction: t });
        const plan = await buildRosterImportPlan(classId, rows, inactive, t);

        const keepIds = new Set((Array.isArray(keepStudentIds) ? keepStudentIds : []).map(Number));
        const removeIds = plan.toRemove.map(s => s.id).filter(id => !keepIds.has(id));

        // Dòng quản lý bỏ chọn: không thêm vào lớp, không tạo hồ sơ và không sửa hồ sơ khớp
        // (hồ sơ khớp có thể là một học sinh khác trùng tên)
        const excludedRows = new Set((Array.isArray(excludeRowNumbers) ? excludeRowNumbers : []).map(Number));
        plan.entries.forEach(entry => {
            if ((entry.action === 'link' || entry.action === 'create') && excludedRows.has(entry.rowNumber)) {
                entry.action = 'excluded';
                entry.reason = 'Quản lý bỏ chọn, không thêm vào lớp';
                entry.changes = [];
            }
        });

        const countBy = (action) => plan.entries.filter(e => e.action === action).length;
        const summary = {
            totalRows: students.length,
            activeRows: rows.length,
            inactiveCount: inactive.length,
            classSize: plan.classSize,
            inClassCount: countBy('inClass'),
            linkCount: countBy('link'),
            createCount: countBy('create'),
            excludedCount: countBy('excluded'),
            updateCount: plan.entries.filter(e => e.changes.length > 0).length,
            removeCount: plan.toRemove.length,
            skippedCount: skipped.length + countBy('skip')
        };
        // Lớp đang có học sinh mà file không khớp em nào -> gần như chắc chắn chọn nhầm file
        const fileMismatch = summary.classSize > 0 && summary.inClassCount === 0;
        const preview = {
            class: { id: classroom.id, className: classroom.className },
            summary,
            fileMismatch,
            entries: plan.entries.map(toRosterPreviewEntry),
            toRemove: plan.toRemove,
            inactive,
            skipped
        };

        if (dryRun) {
            return res.status(200).json(preview);
        }

        if (fileMismatch && removeIds.length > 0) {
            await t.rollback();
            return res.status(400).json({
                message: 'Không có học sinh nào trong file khớp với lớp hiện tại nên hệ thống không xoá học sinh. Hãy kiểm tra lại file hoặc lớp đang chọn.',
                ...preview
            });
        }

        const newStudentIds = [];
        let updatedCount = 0;
        for (const entry of plan.entries) {
            if (entry.changes.length > 0) {
                // Hồ sơ dùng chung giữa các lớp nên thông tin mới cũng hiển thị ở lớp khác của học sinh
                const patch = Object.fromEntries(entry.changes.map(change => [change.field, change.to]));
                await entry.student.update(patch, { transaction: t });
                updatedCount += 1;
            }
            if (entry.action === 'create') {
                const { row } = entry;
                const created = await db.Student.create({
                    fullName: row.fullName,
                    DOB: row.DOB,
                    school: row.school,
                    parentPhoneNumber: row.parentPhoneNumber,
                    parentEmail: row.parentEmail
                }, { transaction: t });
                newStudentIds.push(created.id);
                continue;
            }
            if (entry.action === 'link') {
                newStudentIds.push(entry.student.id);
            }
        }

        const openLessonIds = newStudentIds.length > 0 || removeIds.length > 0
            ? await findOpenLessonIds(classId, t)
            : [];

        if (newStudentIds.length > 0) {
            // Bảng Student_Classes không có unique index; plan đã loại học sinh đang trong lớp
            await db.Student_Classes.bulkCreate(
                newStudentIds.map(studentId => ({ classId, studentId })),
                { transaction: t }
            );

            // Giống "Thêm học sinh vào lớp": học sinh mới cũng có mặt trong các buổi học chưa chốt
            const lessonStudentRows = [];
            for (const lessonId of openLessonIds) {
                for (const studentId of newStudentIds) {
                    lessonStudentRows.push({ lessonId, studentId, attendance: true });
                }
            }
            if (lessonStudentRows.length > 0) {
                await db.LessonStudent.bulkCreate(lessonStudentRows, {
                    ignoreDuplicates: true,
                    transaction: t
                });
            }
        }

        if (removeIds.length > 0) {
            // Giống "Xoá học sinh khỏi lớp": bỏ khỏi lớp và khỏi các buổi học chưa chốt,
            // buổi học đã chốt giữ nguyên để không mất kết quả đã gửi phụ huynh
            await db.Student_Classes.destroy({
                where: { classId, studentId: { [db.Sequelize.Op.in]: removeIds } },
                transaction: t
            });
            if (openLessonIds.length > 0) {
                await db.LessonStudent.destroy({
                    where: {
                        studentId: { [db.Sequelize.Op.in]: removeIds },
                        lessonId: { [db.Sequelize.Op.in]: openLessonIds }
                    },
                    transaction: t
                });
            }
        }

        await t.commit();

        const resultParts = [];
        if (newStudentIds.length > 0) {
            resultParts.push(`thêm ${newStudentIds.length} học sinh vào lớp (tạo mới ${summary.createCount} hồ sơ)`);
        }
        if (updatedCount > 0) resultParts.push(`cập nhật thông tin ${updatedCount} học sinh`);
        if (removeIds.length > 0) resultParts.push(`xoá ${removeIds.length} học sinh khỏi lớp`);

        return res.status(200).json({
            message: resultParts.length > 0
                ? `Đã ${resultParts.join(', ')}.`
                : 'Danh sách lớp và thông tin học sinh đã khớp với file, không có gì cần cập nhật.',
            addedCount: newStudentIds.length,
            updatedCount,
            removedCount: removeIds.length,
            ...preview
        });
    } catch (error) {
        if (t) await t.rollback();
        console.error('importClassStudentsFromExcel error:', error);
        return sendControllerError(res, error, 'Không thể cập nhật danh sách lớp từ file Excel');
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
        let notSavedToSent = 0;
        const errors = [];

        sendResults.forEach((r, i) => {
            if (r.status === "fulfilled") {
                sent++;
                if (r.value?.savedToSent === false) notSavedToSent++;
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
                notSavedToSent,
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
    importClassStudentsFromExcel,
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
