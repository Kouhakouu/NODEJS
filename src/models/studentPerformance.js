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
            // FLOAT chứ không phải INTEGER: tổng điểm là tổng các điểm thành phần
            // 0 / 0.25 / 0.5 / 0.75 / 1 nên có thể là số thập phân (vd 1.5).
            type: DataTypes.FLOAT,
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
