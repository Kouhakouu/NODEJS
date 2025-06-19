// migrations/20250422110100-create-admins.js
'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Admins', {
            userId: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            fullName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            phoneNumber: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('GETDATE()'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('GETDATE()'),
            },
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('Admins');
    },
};
