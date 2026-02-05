require("dotenv").config();
const nodemailer = require("nodemailer");

(async () => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: process.env.SMTP_USER, // tự gửi cho chính mình để test
        subject: "Test SMTP - CMATH",
        html: "<h3>SMTP OK</h3><p>Nếu bạn nhận được mail này là cấu hình đúng.</p>",
    });

    console.log("Sent:", info.messageId);
})().catch(console.error);