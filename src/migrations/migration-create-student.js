'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Students', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            fullName: {
                type: Sequelize.STRING,
                allowNull: false
            },
            DOB: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            school: {
                type: Sequelize.STRING,
                allowNull: true
            },
            parentPhoneNumber: {
                type: Sequelize.STRING,
                allowNull: true
            },
            parentEmail: {
                type: Sequelize.STRING,
                allowNull: true,
                validate: {
                    isEmail: true
                }
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
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Students');
    }
};
