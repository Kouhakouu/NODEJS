'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Lesson_Students', {
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
            studentId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: { model: 'Students', key: 'id' },
                onDelete: 'CASCADE'
            },
            attendance: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Lesson_Students');
    }
};
