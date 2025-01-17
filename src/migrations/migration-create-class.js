'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Classes', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            className: {
                type: Sequelize.STRING,
                allowNull: false
            },
            gradeLevel: {
                type: Sequelize.STRING,
                allowNull: false
            },
            class_schedule_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'ClassSchedules',
                    key: 'id'
                },
                onUpdate: 'CASCADE'
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

        await queryInterface.createTable('Class_Assistants', {
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Classes',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                primaryKey: true
            },
            assistantId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Assistants',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                primaryKey: true
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

        await queryInterface.createTable('Student_Classes', {
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Classes',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                primaryKey: true
            },
            studentId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Students',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                primaryKey: true
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
        await queryInterface.dropTable('Student_Classes');
        await queryInterface.dropTable('Class_Assistants');
        await queryInterface.dropTable('Classes');
    }
};
