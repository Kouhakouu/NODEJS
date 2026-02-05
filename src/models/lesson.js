'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Lesson extends Model {
        static associate(models) {
            Lesson.belongsToMany(models.Student, {
                through: models.LessonStudent,
                foreignKey: 'lessonId'
            });
            Lesson.belongsToMany(models.Class, {
                through: models.LessonClass,
                foreignKey: 'lessonId'
            });
            Lesson.belongsToMany(models.ClassSchedule, {
                through: models.LessonClassSchedules,
                foreignKey: 'lessonId'
            });
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
            allowNull: false,
            defaultValue: 0 // Thêm mặc định là 0
        },
        homeworkList: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isLocked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false // Mặc định là không khóa
        }
    }, {
        sequelize,
        modelName: 'Lesson',
        tableName: 'Lessons',
        timestamps: true,
        // --- THÊM PHẦN HOOKS NÀY ---
        hooks: {
            beforeSave: (lesson) => {
                // Kiểm tra xem homeworkList có thay đổi không hoặc có giá trị không
                if (lesson.homeworkList) {
                    // Tách chuỗi bằng dấu phẩy, lọc bỏ các phần tử rỗng và khoảng trắng
                    const tasks = lesson.homeworkList
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => item !== '');

                    // Gán số lượng đã đếm được vào totalTaskLength
                    lesson.totalTaskLength = tasks.length;
                } else {
                    // Nếu không có danh sách bài tập thì gán bằng 0
                    lesson.totalTaskLength = 0;
                }
            }
        }
    });
    return Lesson;
};