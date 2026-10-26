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

// ===== Upload trực tiếp từ trình duyệt lên Cloudinary =====
// Vercel serverless chặn request body > 4.5MB (trả 413 không kèm CORS -> FE báo "Failed to fetch"),
// nên file PDF lớn không thể đi qua backend. Backend chỉ ký tham số upload, trình duyệt gửi file
// thẳng lên Cloudinary rồi báo lại public_id + chữ ký response để backend xác thực và lưu DB.

const buildGradedPublicIdStem = (lessonId, studentId) => `lesson_${lessonId}_student_${studentId}_`;

const createGradedUploadSignature = ({ lessonId, studentId }) => {
    const cloudinary = require('../config/cloudinary');
    const { api_key, api_secret, cloud_name } = cloudinary.config();
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        folder: GRADED_FILE_FOLDER,
        public_id: `${buildGradedPublicIdStem(lessonId, studentId)}${Date.now()}.pdf`,
        timestamp,
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, api_secret);
    return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloud_name}/raw/upload`,
        apiKey: api_key,
        signature,
        ...paramsToSign,
        maxFileSize: MAX_GRADED_FILE_SIZE,
    };
};

// Xác thực kết quả upload trực tiếp: chữ ký response của Cloudinary đúng (tức file thật sự do
// Cloudinary nhận với public_id/version này) và public_id đúng là file của buổi học + học sinh này.
// Trả về secure URL nếu hợp lệ, null nếu không.
const verifyDirectGradedUpload = ({ publicId, version, signature, lessonId, studentId }) => {
    if (!publicId || !version || !signature) return null;
    const stem = buildGradedPublicIdStem(lessonId, studentId);
    const expected = new RegExp(`(^|/)${stem}\\d+\\.pdf$`);
    if (!expected.test(publicId)) return null;

    const cloudinary = require('../config/cloudinary');
    if (!cloudinary.utils.verify_api_response_signature(publicId, version, signature)) return null;
    return cloudinary.url(publicId, { resource_type: 'raw', secure: true, version, urlAnalytics: false });
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
    createGradedUploadSignature,
    verifyDirectGradedUpload,
    destroyGradedFile,
    fixVietnameseFileName,
};
