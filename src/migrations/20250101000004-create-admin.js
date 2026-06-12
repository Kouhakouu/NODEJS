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
                defaultValue: Sequelize.literal('NOW()'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('Admins');
    },
};
