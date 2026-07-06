// controllers/documentController.js
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const db = require('../models');

// Lazy-load: chỉ nạp SDK Cloudinary khi thực sự upload/xoá file
const cloudinary = {
    get uploader() {
        return require('../config/cloudinary').uploader;
    },
};

// Lưu file tạm trong RAM, không ghi ra đĩa
// Phù hợp khi deploy lên Vercel/serverless
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // giới hạn 10MB / file
    },
});

// Sửa lỗi tên file tiếng Việt bị mã hóa sai kiểu:
// "GÃ³c" -> "Góc"
// "ÄÃ¡p Ã¡n" -> "đáp án"
const fixVietnameseFileName = (fileName = '') => {
    try {
        if (/[ÃÂÄÅÆÐÑ]/.test(fileName)) {
            return Buffer.from(fileName, 'latin1').toString('utf8');
        }

        return fileName;
    } catch {
        return fileName;
    }
};

// Xác định resource_type cho Cloudinary
const getCloudinaryResourceType = (mimeType = '') => {
    if (mimeType.startsWith('image/')) return 'image';

    // Cloudinary xử lý PDF tốt hơn dưới dạng image.
    // Bạn đã bật Allow delivery PDF/ZIP nên tải được.
    if (mimeType === 'application/pdf') return 'image';

    if (mimeType.startsWith('video/')) return 'video';

    // Word, Excel, PowerPoint, file nén... nên để raw
    return 'raw';
};

// Tạo public_id an toàn cho Cloudinary
const sanitizePublicId = (name, resourceType) => {
    const ext = path.extname(name); // .pdf, .docx, .xlsx, .png...
    const base = path.basename(name, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_');

    const safeBase = `${base}_${Date.now()}`;

    // Với raw file như docx, pptx, xlsx, nên giữ đuôi file trong public_id
    // để Cloudinary tải về đúng định dạng.
    if (resourceType === 'raw') {
        return `${safeBase}${ext}`;
    }

    // Với image/pdf/video không đưa ext vào public_id,
    // tránh lỗi URL kiểu .png.png hoặc .pdf.pdf.
    return safeBase;
};

// Helper: đẩy buffer file lên Cloudinary bằng stream
const uploadBufferToCloudinary = (fileBuffer, originalName, mimeType) => {
    return new Promise((resolve, reject) => {
        const resourceType = getCloudinaryResourceType(mimeType);
        const publicId = sanitizePublicId(originalName, resourceType);

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'cmath-documents',
                resource_type: resourceType,
                public_id: publicId,
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

// POST /teacher/documents
// multipart/form-data: file, title, description
const uploadDocument = async (req, res) => {
    try {
        const teacherId = req.user?.userId;

        if (!teacherId) {
            return res.status(401).json({
                message: 'Unauthorized: User not found',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: 'Vui lòng chọn file để tải lên.',
            });
        }

        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({
                message: 'Vui lòng nhập tiêu đề tài liệu.',
            });
        }

        // Sửa tên file tiếng Việt trước khi upload và lưu DB
        const originalFileName = fixVietnameseFileName(req.file.originalname);

        // Đẩy file lên Cloudinary
        const result = await uploadBufferToCloudinary(
            req.file.buffer,
            originalFileName,
            req.file.mimetype
        );

        // DB chỉ lưu đường link + metadata
        const doc = await db.Document.create({
            title,
            description: description || null,
            fileUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            fileName: originalFileName,
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

        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tải tài liệu lên.',
        });
    }
};

// GET /teacher/documents
// Lấy danh sách tài liệu của giáo viên đang đăng nhập
const getDocuments = async (req, res) => {
    try {
        const teacherId = req.user?.userId;

        if (!teacherId) {
            return res.status(401).json({
                message: 'Unauthorized: User not found',
            });
        }

        const documents = await db.Document.findAll({
            where: { teacherId },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({
            message: 'Lấy danh sách tài liệu thành công',
            documents,
        });
    } catch (error) {
        console.error('getDocuments error:', error);

        return res.status(500).json({
            message: 'Internal server error',
        });
    }
};

// GET /teacher/documents/:id/download
// Tải file thông qua backend, giữ đúng tên file tiếng Việt
const downloadDocument = async (req, res) => {
    try {
        const teacherId = req.user?.userId;

        if (!teacherId) {
            return res.status(401).json({
                message: 'Unauthorized: User not found',
            });
        }

        const docId = parseInt(req.params.id, 10);

        if (Number.isNaN(docId)) {
            return res.status(400).json({
                message: 'ID tài liệu không hợp lệ.',
            });
        }

        const doc = await db.Document.findOne({
            where: {
                id: docId,
                teacherId,
            },
        });

        if (!doc) {
            return res.status(404).json({
                message: 'Không tìm thấy tài liệu.',
            });
        }

        const response = await axios.get(doc.fileUrl, {
            responseType: 'stream',
        });

        const fileName = doc.fileName || 'document';
        const encodedFileName = encodeURIComponent(fileName);

        res.setHeader(
            'Content-Type',
            doc.fileType || 'application/octet-stream'
        );

        // filename*=UTF-8 giúp tải file tiếng Việt không bị lỗi tên
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodedFileName}`
        );

        response.data.pipe(res);
    } catch (error) {
        console.error('downloadDocument error:', error.message);

        return res.status(500).json({
            message: 'Không thể tải tài liệu.',
        });
    }
};

// DELETE /teacher/documents/:id
// Xóa cả record DB lẫn file trên Cloudinary
const deleteDocument = async (req, res) => {
    try {
        const teacherId = req.user?.userId;

        if (!teacherId) {
            return res.status(401).json({
                message: 'Unauthorized: User not found',
            });
        }

        const docId = parseInt(req.params.id, 10);

        if (Number.isNaN(docId)) {
            return res.status(400).json({
                message: 'ID tài liệu không hợp lệ.',
            });
        }

        const doc = await db.Document.findOne({
            where: {
                id: docId,
                teacherId,
            },
        });

        if (!doc) {
            return res.status(404).json({
                message: 'Không tìm thấy tài liệu.',
            });
        }

        // Xóa file trên Cloudinary nếu có publicId
        if (doc.publicId) {
            try {
                await cloudinary.uploader.destroy(doc.publicId, {
                    resource_type: doc.resourceType || 'image',
                });
            } catch (e) {
                console.warn('Không xóa được file trên Cloudinary:', e.message);
            }
        }

        await doc.destroy();

        return res.status(200).json({
            message: 'Đã xóa tài liệu.',
        });
    } catch (error) {
        console.error('deleteDocument error:', error);

        return res.status(500).json({
            message: 'Internal server error',
        });
    }
};

module.exports = {
    upload,
    uploadDocument,
    getDocuments,
    downloadDocument,
    deleteDocument,
};