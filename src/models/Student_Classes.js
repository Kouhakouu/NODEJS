'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Student_Classes extends Model {
        static associate(models) {
            // Định nghĩa liên kết nếu cần, 
        }
    }
    Student_Classes.init({
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Students',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Classes',
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        sequelize,
        modelName: 'Student_Classes',
        tableName: 'Student_Classes',
        timestamps: true,
    });
    return Student_Classes;
};
