'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        // Trạng thái kích hoạt tài khoản trợ giảng: 0 = chưa kích hoạt, 1 = đã kích hoạt
        await queryInterface.addColumn('Assistants', 'status', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
        // Mã xác thực gửi về email khi trợ giảng làm xong bài test (xoá sau khi xác thực thành công)
        await queryInterface.addColumn('Assistants', 'verifyCode', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('Assistants', 'verifyCode');
        await queryInterface.removeColumn('Assistants', 'status');
    },
};
