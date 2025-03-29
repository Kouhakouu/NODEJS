'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Lesson_ClassSchedules', {
            lessonId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'Lessons',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            classScheduleId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'ClassSchedules', // bảng ClassSchedules cần được định nghĩa
                    key: 'id'
                },
                onDelete: 'CASCADE'
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Lesson_ClassSchedules');
    }
};
