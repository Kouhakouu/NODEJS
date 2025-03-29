
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Class_Assistant extends Model {
        /**
         * Helper method for defining associations.
         */
        static associate(models) {
            // Định nghĩa thêm nếu cần
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
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'Class_Assistant',
        tableName: 'Class_Assistants',
        timestamps: true
    });
    return Class_Assistant;
};
