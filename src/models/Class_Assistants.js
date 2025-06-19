'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Class_Assistant extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            // Định nghĩa quan hệ nhiều–nhiều ở phía Class và Assistant
        }
    }
    Class_Assistant.init({
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Classes',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        assistantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Assistants',
                key: 'userId'
            },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'Class_Assistant',
        tableName: 'Class_Assistants',
        timestamps: false
    });
    return Class_Assistant;
};