const db = require('../models');

// Admin: lấy tất cả khóa học kèm tên giáo viên
const getAllCourses = async (req, res) => {
    try {
        const courses = await db.Course.findAll({
            include: [{
                model: db.Teacher,
                as: 'teacher',
                attributes: ['userId', 'fullName']
            }],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json(courses);
    } catch (e) {
        console.error('getAllCourses error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: cập nhật trạng thái hiển thị + tag của khóa học
const updateCourseVisibility = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10);
        const { isPublished, tag } = req.body;

        const course = await db.Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học' });

        course.isPublished = Boolean(isPublished);
        course.tag = isPublished ? (tag || null) : null;
        await course.save();

        return res.status(200).json({ message: 'Cập nhật thành công', course });
    } catch (e) {
        console.error('updateCourseVisibility error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Guest: lấy khóa học đang hiển thị, lọc theo tag (tuỳ chọn)
const getPublishedCourses = async (req, res) => {
    try {
        const { tag } = req.query;
        const where = { isPublished: true };
        if (tag) where.tag = tag;

        const courses = await db.Course.findAll({
            where,
            include: [{
                model: db.Teacher,
                as: 'teacher',
                attributes: ['userId', 'fullName']
            }],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json(courses);
    } catch (e) {
        console.error('getPublishedCourses error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getAllCourses, updateCourseVisibility, getPublishedCourses };
