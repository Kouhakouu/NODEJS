'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class StudentPerformance extends Model {
        static associate(models) {
            // StudentPerformance có quan hệ N-N với Student thông qua StudentPerformanceStudent
            StudentPerformance.belongsToMany(models.Student, {
                through: models.StudentPerformanceStudent,
                foreignKey: 'studentPerformanceId'
            });
            // StudentPerformance có quan hệ N-N với Lesson thông qua StudentPerformanceLesson
            StudentPerformance.belongsToMany(models.Lesson, {
                through: models.StudentPerformanceLesson,
                foreignKey: 'studentPerformanceId'
            });
        }
    }
    StudentPerformance.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        doneTask: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        totalScore: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        incorrectTasks: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        missingTasks: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        presentation: {
            type: DataTypes.STRING,
            allowNull: true
        },
        skills: {
            type: DataTypes.STRING,
            allowNull: true
        },
        comment: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'StudentPerformance',
        tableName: 'StudentPerformances',
        timestamps: true
    });
    return StudentPerformance;
};
