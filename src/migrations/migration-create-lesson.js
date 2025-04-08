'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Lessons', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            lessonContent: {
                type: Sequelize.STRING,
                allowNull: false
            },
            totalTaskLength: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            lessonDate: {
                type: Sequelize.DATE,
                allowNull: false
            },
            // Thêm cột homeworkList
            homeworkList: {
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
        await queryInterface.dropTable('Lessons');
    }
};
