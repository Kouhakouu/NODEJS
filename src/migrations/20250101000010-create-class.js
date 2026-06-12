'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Classes', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            className: {
                type: Sequelize.STRING,
                allowNull: false
            },
            gradeLevel: {
                type: Sequelize.STRING,
                allowNull: false
            },
            class_schedule_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'ClassSchedules',
                    key: 'id'
                },
                onUpdate: 'CASCADE'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Classes');
    }
};
