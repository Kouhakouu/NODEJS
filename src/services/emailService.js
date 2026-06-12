// services/emailService.js
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

// cache theo templateName
const templateCache = new Map();

function getTemplate(templateName) {
    if (templateCache.has(templateName)) return templateCache.get(templateName);

    const templatePath = path.join(__dirname, "..", "views", `${templateName}.hbs`);
    const source = fs.readFileSync(templatePath, "utf8");
    const compiled = handlebars.compile(source);

    templateCache.set(templateName, compiled);
    return compiled;
}

function smtpConfig(extra = {}) {
    return {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        ...extra,
    };
}

function createTransporter() {
    return nodemailer.createTransport(smtpConfig());
}

async function sendTemplatedEmail({ to, subject, templateName, data }) {
    const transporter = createTransporter();
    const template = getTemplate(templateName);
    const html = template(data);

    return transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
    });
}

async function sendLessonResultEmail({ to, subject, data }) {
    return sendTemplatedEmail({
        to,
        subject,
        templateName: "lesson-result",
        data,
    });
}

// Gửi nhiều email cùng template trên 1 transporter pool (tối đa 3 kết nối SMTP),
// thay vì mở 1 kết nối mới cho từng email như sendTemplatedEmail.
// items: [{ to, subject, data, meta }] -> trả về kết quả allSettled theo đúng thứ tự items.
async function sendBatchTemplatedEmails({ items, templateName }) {
    if (!items || items.length === 0) return [];

    const template = getTemplate(templateName);
    const transporter = nodemailer.createTransport(
        smtpConfig({ pool: true, maxConnections: 3 })
    );

    try {
        return await Promise.allSettled(
            items.map(item =>
                transporter.sendMail({
                    from: process.env.MAIL_FROM || process.env.SMTP_USER,
                    to: item.to,
                    subject: item.subject,
                    html: template(item.data),
                })
            )
        );
    } finally {
        transporter.close();
    }
}

async function sendLessonResultEmailsBatch(items) {
    return sendBatchTemplatedEmails({ items, templateName: "lesson-result" });
}

async function sendQuizSubmissionEmail({ to, subject, data }) {
    return sendTemplatedEmail({
        to,
        subject,
        templateName: "quiz-submission",
        data,
    });
}

async function sendQuizResultEmail({ to, subject, data }) {
    return sendTemplatedEmail({
        to,
        subject,
        templateName: "quiz-result",
        data,
    });
}

async function sendAssistantCodeEmail({ to, subject, data }) {
    return sendTemplatedEmail({
        to,
        subject,
        templateName: "assistant-code",
        data,
    });
}

module.exports = { sendLessonResultEmail, sendLessonResultEmailsBatch, sendQuizSubmissionEmail, sendQuizResultEmail, sendAssistantCodeEmail };