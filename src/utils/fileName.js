// Sửa lỗi tên file tiếng Việt bị mã hóa sai kiểu (multer đọc tên file theo latin1):
// "GÃ³c" -> "Góc"
// "ÄÃ¡p Ã¡n" -> "đáp án"
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

module.exports = { fixVietnameseFileName };
