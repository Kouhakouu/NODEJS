'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ClassSchedules', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            study_day: {
                type: Sequelize.STRING,
                allowNull: false
            },
            start_time: {
                type: Sequelize.TIME,
                allowNull: false
            },
            end_time: {
                type: Sequelize.TIME,
                allowNull: false
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
        await queryInterface.dropTable('ClassSchedules');
    }
};
