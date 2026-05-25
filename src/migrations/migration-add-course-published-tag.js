"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn("Courses", "isPublished", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
        await queryInterface.addColumn("Courses", "tag", {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn("Courses", "isPublished");
        await queryInterface.removeColumn("Courses", "tag");
    }
};
