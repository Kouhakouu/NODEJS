'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class LessonClassSchedules extends Model {
        static associate(models) {
            // Định nghĩa associations nếu cần
        }
    }
    LessonClassSchedules.init({
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
        classScheduleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'ClassSchedules', // model ClassSchedules cần được định nghĩa
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'LessonClassSchedules',
        tableName: 'Lesson_ClassSchedules',
        timestamps: false
    });
    return LessonClassSchedules;
};
