'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class StudentPerformanceStudent extends Model {
        static associate(models) {
            // Định nghĩa associations nếu cần
        }
    }
    StudentPerformanceStudent.init({
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
        studentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            // references: { model: 'Students', key: 'id' },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'StudentPerformanceStudent',
        tableName: 'StudentPerformance_Students',
        timestamps: false
    });
    return StudentPerformanceStudent;
};
