'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class LessonStudent extends Model {
        static associate(models) {
            // Nếu cần định nghĩa quan hệ trực tiếp, có thể thực hiện ở đây
        }
    }
    LessonStudent.init({
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
        studentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            // Nếu model Student được định nghĩa, có thể thêm tham chiếu:
            // references: { model: 'Students', key: 'id' },
            onDelete: 'CASCADE'
        },
        attendance: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'LessonStudent',
        tableName: 'Lesson_Students',
        timestamps: false
    });
    return LessonStudent;
};
