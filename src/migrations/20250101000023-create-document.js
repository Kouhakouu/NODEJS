"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Documents", {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            title: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            fileUrl: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            publicId: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            fileName: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            fileType: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            fileSize: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            teacherId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "Teachers",
                    key: "userId",
                },
                onDelete: "CASCADE",
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("Documents");
    },
};
