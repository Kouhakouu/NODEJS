// migrations/20230101000000-create-class-assistants.js

'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Class_Assistants', {
      classId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Classes',
          key: 'id'
        },
        onDelete: 'CASCADE',
        primaryKey: true
      },
      assistantId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Assistants',
          key: 'userId'
        },
        onDelete: 'CASCADE',
        primaryKey: true
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Class_Assistants');
  }
};
