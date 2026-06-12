// Kiểm tra bcrypt native đọc được hash $2a$ do bcryptjs cũ tạo ra
const bcrypt = require('bcrypt');

(async () => {
    // Hash $2b$ mới tạo, đổi prefix thành $2a$ (định dạng bcryptjs cũ dùng)
    const hash2b = await bcrypt.hash('CmathAdmin@123', 10);
    const hash2a = hash2b.replace('$2b$', '$2a$');

    const ok2a = await bcrypt.compare('CmathAdmin@123', hash2a);
    const bad2a = await bcrypt.compare('saimatkhau', hash2a);

    console.log('compare dung mat khau voi hash $2a$:', ok2a);   // mong đợi: true
    console.log('compare sai mat khau voi hash $2a$:', bad2a);   // mong đợi: false
    process.exit(ok2a && !bad2a ? 0 : 1);
})();
