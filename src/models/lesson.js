'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Lesson extends Model {
        static associate(models) {
            // Lesson có quan hệ N-N với Student thông qua LessonStudent
            Lesson.belongsToMany(models.Student, {
                through: models.LessonStudent,
                foreignKey: 'lessonId'
            });
            // Lesson có quan hệ N-N với Class thông qua LessonClass
            Lesson.belongsToMany(models.Class, {
                through: models.LessonClass,
                foreignKey: 'lessonId'
            });
            // Lesson có quan hệ N-N với ClassSchedule thông qua LessonClassSchedules
            Lesson.belongsToMany(models.ClassSchedule, {
                through: models.LessonClassSchedules,
                foreignKey: 'lessonId'
            });
            // Lesson có quan hệ N-N với StudentPerformance thông qua StudentPerformanceLesson
            Lesson.belongsToMany(models.StudentPerformance, {
                through: models.StudentPerformanceLesson,
                foreignKey: 'lessonId'
            });
        }
    }
    Lesson.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        lessonContent: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lessonDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        totalTaskLength: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Lesson',
        tableName: 'Lessons',
        timestamps: true
    });
    return Lesson;
};
