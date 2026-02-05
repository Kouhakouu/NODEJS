// services/emailService.js
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

let cachedTemplate = null;

function getTemplate() {
    if (cachedTemplate) return cachedTemplate;

    const templatePath = path.join(__dirname, "..", "views", "lesson-result.hbs");
    const source = fs.readFileSync(templatePath, "utf8");
    cachedTemplate = handlebars.compile(source);
    return cachedTemplate;
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

async function sendLessonResultEmail({ to, subject, data }) {
    const transporter = createTransporter();
    const template = getTemplate();
    const html = template(data);

    return transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
    });
}

module.exports = { sendLessonResultEmail };