// controllers/documentController.js
const multer = require('multer');
const db = require('../models');
// Lazy-load: chỉ nạp SDK Cloudinary khi thực sự upload/xoá file
const cloudinary = {
    get uploader() { return require('../config/cloudinary').uploader; }
};

// Lưu file tạm trong RAM (không ghi ra đĩa) -> hợp với serverless trên Vercel
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // giới hạn 10MB/ file
});

// Helper: đẩy buffer file lên Cloudinary bằng stream
const path = require('path');

const sanitizeFileName = (name) => {
    const ext = path.extname(name); // .pdf, .docx, .xlsx...
    const base = path.basename(name, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${base}_${Date.now()}${ext}`;
};

const uploadBufferToCloudinary = (fileBuffer, originalName) => {
    return new Promise((resolve, reject) => {
        const safeName = sanitizeFileName(originalName);

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'cmath-documents',
                resource_type: 'auto',
                public_id: safeName,
                use_filename: false,
                unique_filename: false,
                filename_override: originalName,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(fileBuffer);
    });
};

// POST /teacher/documents  (multipart/form-data: file, title, description)
const uploadDocument = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized: User not found' });

        if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file để tải lên.' });

        const { title, description } = req.body;
        if (!title) return res.status(400).json({ message: 'Vui lòng nhập tiêu đề tài liệu.' });

        // 1. Đẩy file lên Cloudinary
        const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);

        // 2. DB chỉ lưu đường link + metadata
        const doc = await db.Document.create({
            title,
            description: description || null,
            fileUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            teacherId,
        });

        return res.status(201).json({
            message: 'Tải tài liệu lên thành công!',
            document: doc,
        });
    } catch (error) {
        console.error('uploadDocument error:', error);
        return res.status(500).json({ message: 'Đã xảy ra lỗi khi tải tài liệu lên.' });
    }
};

// GET /teacher/documents  -> danh sách tài liệu của giáo viên đang đăng nhập
const getDocuments = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized: User not found' });

        const documents = await db.Document.findAll({
            where: { teacherId },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ message: 'Lấy danh sách tài liệu thành công', documents });
    } catch (error) {
        console.error('getDocuments error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// DELETE /teacher/documents/:id  -> xóa cả record DB lẫn file trên Cloudinary
const deleteDocument = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        if (!teacherId) return res.status(401).json({ message: 'Unauthorized: User not found' });

        const docId = parseInt(req.params.id, 10);
        const doc = await db.Document.findOne({ where: { id: docId, teacherId } });
        if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu.' });

        // Xóa file trên Cloudinary (nếu có public_id)
        if (doc.publicId) {
            try {
                await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' });
            } catch (e) {
                console.warn('Không xóa được file trên Cloudinary:', e.message);
            }
        }

        await doc.destroy();
        return res.status(200).json({ message: 'Đã xóa tài liệu.' });
    } catch (error) {
        console.error('deleteDocument error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    upload,
    uploadDocument,
    getDocuments,
    deleteDocument,
};
