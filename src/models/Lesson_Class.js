'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class LessonClass extends Model {
        static associate(models) {
            // Định nghĩa associations nếu cần
        }
    }
    LessonClass.init({
        lessonId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'Lessons',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        classId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'Classes', // model Classes cần được định nghĩa
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'LessonClass',
        tableName: 'Lesson_Classes',
        timestamps: false
    });
    return LessonClass;
};
