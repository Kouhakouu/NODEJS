// migrations/20250422-create-roles.js
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
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('Roles');
    }
};
