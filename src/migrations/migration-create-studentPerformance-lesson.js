'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('StudentPerformance_Lessons', {
            studentPerformanceId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'StudentPerformances',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            lessonId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'Lessons',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('StudentPerformance_Lessons');
    }
};
