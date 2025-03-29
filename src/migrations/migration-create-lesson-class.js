'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Lesson_Classes', {
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
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'Classes', // bảng Classes cần được định nghĩa
                    key: 'id'
                },
                onDelete: 'CASCADE'
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Lesson_Classes');
    }
};
