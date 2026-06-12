// Cấu hình Cloudinary - dùng để lưu file tài liệu trên cloud
// Lấy 3 biến này ở Dashboard Cloudinary sau khi đăng ký tài khoản (free)
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
