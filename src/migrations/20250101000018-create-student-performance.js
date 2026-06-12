'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('StudentPerformances', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            doneTask: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            totalScore: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            incorrectTasks: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: []
            },
            missingTasks: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: []
            },
            presentation: {
                type: Sequelize.STRING,
                allowNull: true
            },
            skills: {
                type: Sequelize.STRING,
                allowNull: true
            },
            comment: {
                type: Sequelize.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('StudentPerformances');
    }
};
