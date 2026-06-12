'use strict';
require('dotenv').config();
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const email = process.env.SEED_ADMIN_EMAIL || 'admin@cmath.com';
        const password = process.env.SEED_ADMIN_PASSWORD || 'CmathAdmin@123';
        const hashed = await bcrypt.hash(password, 10);

        // roleId = 1 (ADMIN), theo thứ tự seed trong migration tạo bảng Roles
        const [[user]] = await queryInterface.sequelize.query(
            `INSERT INTO "Users" (email, password, "roleId", "createdAt", "updatedAt")
             VALUES (:email, :password, 1, NOW(), NOW())
             RETURNING "userId"`,
            { replacements: { email, password: hashed } }
        );

        await queryInterface.bulkInsert('Admins', [{
            userId: user.userId,
            fullName: 'Quan tri vien',
            phoneNumber: '0000000000',
            createdAt: new Date(),
            updatedAt: new Date()
        }]);
    },

    async down(queryInterface, Sequelize) {
        const email = process.env.SEED_ADMIN_EMAIL || 'admin@cmath.com';

        await queryInterface.sequelize.query(
            `DELETE FROM "Admins" WHERE "userId" IN (SELECT "userId" FROM "Users" WHERE email = :email)`,
            { replacements: { email } }
        );
        await queryInterface.bulkDelete('Users', { email });
    }
};
