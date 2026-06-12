'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Roles', {
            roleId: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            roleName: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            createdAt: Sequelize.DATE,
            updatedAt: Sequelize.DATE
        });

        await queryInterface.bulkInsert('Roles', [
            { roleName: 'ADMIN', createdAt: new Date(), updatedAt: new Date() },
            { roleName: 'TEACHER', createdAt: new Date(), updatedAt: new Date() },
            { roleName: 'MANAGER', createdAt: new Date(), updatedAt: new Date() },
            { roleName: 'ASSISTANT', createdAt: new Date(), updatedAt: new Date() },
            { roleName: 'STUDENT', createdAt: new Date(), updatedAt: new Date() }
        ]);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('Roles');
    }
};
