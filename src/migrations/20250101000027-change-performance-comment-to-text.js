'use strict';
// Đổi kiểu cột StudentPerformances.comment từ VARCHAR(255) sang TEXT.
// Lý do: nhận xét nay gồm 2 dòng (quá trình học trên lớp + BTVN) nên vượt 255 ký tự,
// gây lỗi 'value too long for type character varying(255)' khi Submit chấm bài.
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('StudentPerformances', 'comment', {
            type: Sequelize.TEXT,
            allowNull: true
        });
    },
    down: async (queryInterface, Sequelize) => {
        // Cắt về 255 ký tự để không lỗi khi quay lại VARCHAR(255).
        await queryInterface.sequelize.query(
            `UPDATE "StudentPerformances" SET "comment" = LEFT("comment", 255) WHERE LENGTH("comment") > 255`
        );
        await queryInterface.changeColumn('StudentPerformances', 'comment', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }
};
