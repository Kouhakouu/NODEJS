// One-off script: tạo schema trên Postgres (Neon) từ Sequelize models + seed Roles + 1 tài khoản Admin.
// CẢNH BÁO: sync({ force: true }) sẽ XÓA TOÀN BỘ bảng hiện có trước khi tạo lại. Chỉ dùng cho DB trống.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/models');

async function main() {
    await db.sequelize.sync({ force: true });
    console.log('Schema synced.');

    // Thứ tự PHẢI giữ đúng ADMIN, TEACHER, MANAGER, ASSISTANT, STUDENT
    // vì một số controller hardcode roleId (2 = Teacher, 3 = Manager, 4 = Assistant)
    const roles = await db.Role.bulkCreate([
        { roleName: 'ADMIN' },
        { roleName: 'TEACHER' },
        { roleName: 'MANAGER' },
        { roleName: 'ASSISTANT' },
        { roleName: 'STUDENT' },
    ]);
    console.log('Roles seeded:', roles.map(r => `${r.roleId}=${r.roleName}`).join(', '));

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@cmath.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'CmathAdmin@123';
    const hashed = await bcrypt.hash(adminPassword, 10);

    const adminUser = await db.User.create({
        email: adminEmail,
        password: hashed,
        roleId: 1, // ADMIN
    });
    await db.Admin.create({
        userId: adminUser.userId,
        fullName: 'Quan tri vien',
        phoneNumber: '0000000000',
    });
    console.log(`Admin account created: ${adminEmail} / ${adminPassword}`);

    await db.sequelize.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
