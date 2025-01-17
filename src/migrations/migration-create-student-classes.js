'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Student_Classes', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            studentId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Students',  // Tên bảng Students
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Classes',   // Tên bảng Classes
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Student_Classes');
    }
};
