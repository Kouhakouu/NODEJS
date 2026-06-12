"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Document extends Model {
        static associate(models) {
            Document.belongsTo(models.Teacher, { foreignKey: "teacherId", as: "teacher" });
        }
    }

    Document.init(
        {
            title: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            // Đường link file trên Cloudinary (đúng ý mentor: DB chỉ lưu link)
            fileUrl: {
                type: DataTypes.STRING,
                allowNull: false
            },
            // public_id của Cloudinary - cần để xóa file trên cloud khi xóa tài liệu
            publicId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            fileName: {
                type: DataTypes.STRING,
                allowNull: true
            },
            fileType: {
                type: DataTypes.STRING,
                allowNull: true
            },
            fileSize: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            teacherId: {
                type: DataTypes.INTEGER,
                allowNull: false
            }
        },
        {
            sequelize,
            modelName: "Document",
            timestamps: true
        }
    );

    return Document;
};
