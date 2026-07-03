'use strict';
const bcrypt = require('bcrypt');

// roleId = 2 (TEACHER), theo thứ tự seed trong migration tạo bảng Roles
const ROLE_ID_TEACHER = 2;
const DEFAULT_PASSWORD = '123456';

const TEACHERS = [
    { fullName: 'Vũ Công Hiệp', email: 'vuconghiep.teacher@cmath.com', phoneNumber: '0838336576' },
    { fullName: 'Hà Huy Khôi', email: 'hahuykhoi.teacher@cmath.com', phoneNumber: '0963280620' },
    { fullName: 'Trần Thị Thắng', email: 'tranthithang.teacher@cmath.com', phoneNumber: '0867515403' },
    { fullName: 'Trương Vân Linh', email: 'truongvanlinh.teacher@cmath.com', phoneNumber: '0372778748' },
    { fullName: 'Vũ Đình Tuấn', email: 'vudinhtuan.teacher@cmath.com', phoneNumber: '0976635496' },
    { fullName: 'Nguyễn Phương Thảo', email: 'nguyenphuongthao.teacher@cmath.com', phoneNumber: '0356029766' },
    { fullName: 'Phan Thế Anh', email: 'phantheanh.teacher@cmath.com', phoneNumber: '0393138838' },
    { fullName: 'Nguyễn Thu Hiền', email: 'nguyenthuhien.teacher@cmath.com', phoneNumber: '0866230338' },
    // Trùng tên với dòng phía trên -> thêm số "2" vào email để không vi phạm unique
    { fullName: 'Nguyễn Phương Thảo', email: 'nguyenphuongthao2.teacher@cmath.com', phoneNumber: '0385373336' },
    { fullName: 'Lưu Văn Trung', email: 'luuvantrung.teacher@cmath.com', phoneNumber: '0846846880' },
    { fullName: 'Đặng Thị Hà Thu', email: 'dangthihathu.teacher@cmath.com', phoneNumber: '0386815002' },
    { fullName: 'Đỗ Lý Minh Hải', email: 'dolyminhhai.teacher@cmath.com', phoneNumber: '0978051367' },
    { fullName: 'Trương Mỹ Tâm', email: 'truongmytam.teacher@cmath.com', phoneNumber: '0976188413' },
    { fullName: 'Nguyễn Thanh Quỳnh', email: 'nguyenthanhquynh.teacher@cmath.com', phoneNumber: '0888778479' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        for (const t of TEACHERS) {
            const [[user]] = await queryInterface.sequelize.query(
                `INSERT INTO "Users" (email, password, "roleId", "createdAt", "updatedAt")
                 VALUES (:email, :password, :roleId, NOW(), NOW())
                 RETURNING "userId"`,
                { replacements: { email: t.email, password: hashed, roleId: ROLE_ID_TEACHER } }
            );

            await queryInterface.bulkInsert('Teachers', [{
                userId: user.userId,
                fullName: t.fullName,
                phoneNumber: t.phoneNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
            }]);
        }
    },

    async down(queryInterface, Sequelize) {
        const emails = TEACHERS.map(t => t.email);

        await queryInterface.sequelize.query(
            `DELETE FROM "Teachers" WHERE "userId" IN (SELECT "userId" FROM "Users" WHERE email IN (:emails))`,
            { replacements: { emails } }
        );
        await queryInterface.bulkDelete('Users', { email: emails });
    }
};
