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
                allowNull: false,
                defaultValue: 0 // <--- THÊM DÒNG NÀY
            },
            lessonDate: {
                type: Sequelize.DATE,
                allowNull: false
            },
            homeworkList: {
                type: Sequelize.TEXT, // <--- ĐỔI THÀNH TEXT để lưu được nhiều bài tập hơn
                allowNull: true
            },
            isLocked: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
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