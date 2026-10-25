// File PDF bài tập đã chấm của học sinh: trợ giảng upload lên Cloudinary,
// quản lý gửi kèm trong mail kết quả. DB (Lesson_Students) chỉ lưu link + public_id.
const multer = require('multer');
const { fixVietnameseFileName } = require('../utils/fileName');

// Lazy-load: chỉ nạp SDK Cloudinary khi thực sự upload/xoá file
const getUploader = () => require('../config/cloudinary').uploader;

const GRADED_FILE_FOLDER = 'cmath-graded-homework';
const MAX_GRADED_FILE_SIZE = 10 * 1024 * 1024; // 10MB, đủ nhỏ để gửi kèm mail

// Lưu file tạm trong RAM (giống tài liệu giáo viên), chỉ nhận PDF
const gradedFileMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_GRADED_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
        if (!isPdf) return cb(new Error('Chỉ nhận file PDF.'));
        cb(null, true);
    },
}).single('file');

// Bọc multer để lỗi (sai định dạng, quá dung lượng) trả về JSON 400 thay vì trang lỗi 500 của Express
const uploadGradedFileMiddleware = (req, res, next) => {
    gradedFileMulter(req, res, (err) => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File quá lớn, tối đa 10MB.'
            : err.message || 'Upload file thất bại.';
        return res.status(400).json({ message });
    });
};

// Upload dạng raw (không phải image) vì Cloudinary tài khoản free mặc định chặn tải PDF dạng image,
// còn raw thì tải được ngay - nodemailer cần tải được link này để đính kèm vào mail.
const uploadGradedPdf = (fileBuffer, { lessonId, studentId }) => {
    return new Promise((resolve, reject) => {
        const stream = getUploader().upload_stream(
            {
                folder: GRADED_FILE_FOLDER,
                resource_type: 'raw',
                // Raw file phải giữ đuôi .pdf trong public_id để tải về đúng định dạng
                public_id: `lesson_${lessonId}_student_${studentId}_${Date.now()}.pdf`,
                use_filename: false,
                unique_filename: false,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(fileBuffer);
    });
};

// Xoá file trên Cloudinary. Không throw: file mồ côi trên cloud không được làm hỏng thao tác chính.
const destroyGradedFile = async (publicId) => {
    if (!publicId) return;
    try {
        await getUploader().destroy(publicId, { resource_type: 'raw' });
    } catch (err) {
        console.error('destroyGradedFile error:', err.message);
    }
};

module.exports = {
    uploadGradedFileMiddleware,
    uploadGradedPdf,
    destroyGradedFile,
    fixVietnameseFileName,
};
