'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class StudentPerformanceLesson extends Model {
        static associate(models) {
            // Định nghĩa associations nếu cần
        }
    }
    StudentPerformanceLesson.init({
        studentPerformanceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'StudentPerformances',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        lessonId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: {
                model: 'Lessons',
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'StudentPerformanceLesson',
        tableName: 'StudentPerformance_Lessons',
        timestamps: false
    });
    return StudentPerformanceLesson;
};
