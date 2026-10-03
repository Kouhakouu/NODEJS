// services/emailService.js
const nodemailer = require("nodemailer");
const MailComposer = require("nodemailer/lib/mail-composer");
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
        tls: {
            rejectUnauthorized: false
        },
        ...extra,
    };
}

function createTransporter() {
    return nodemailer.createTransport(smtpConfig());
}

// SMTP chỉ gửi mail, không tự lưu bản sao vào thư mục Sent (riêng Gmail thì tự lưu).
// Bật IMAP_SAVE_SENT=true để chép mail đã gửi vào Sent qua IMAP, giống Outlook làm khi gửi tay.
function imapConfig() {
    return {
        host: process.env.IMAP_HOST || process.env.SMTP_HOST,
        port: Number(process.env.IMAP_PORT) || 993,
        secure: (process.env.IMAP_SECURE || "true") === "true",
        auth: {
            user: process.env.IMAP_USER || process.env.SMTP_USER,
            pass: process.env.IMAP_PASS || process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        logger: false,
    };
}

let sentFolderCache = null;

async function resolveSentFolder(client) {
    if (process.env.IMAP_SENT_FOLDER) return process.env.IMAP_SENT_FOLDER;
    if (sentFolderCache) return sentFolderCache;

    const boxes = await client.list();
    const found = boxes.find(b => b.specialUse === "\\Sent")
        || boxes.find(b => /^(INBOX[./])?Sent( Items| Messages)?$/i.test(b.path));
    if (!found) throw new Error("Không tìm thấy thư mục Sent trên IMAP, hãy đặt IMAP_SENT_FOLDER");

    sentFolderCache = found.path;
    return sentFolderCache;
}

// Chép các mail (raw MIME) vào thư mục Sent trên 1 kết nối IMAP.
// Trả về mảng boolean theo đúng thứ tự raws: true = đã lưu. Không bao giờ throw,
// vì mail đã gửi đi rồi, lỗi lưu bản sao không được làm hỏng kết quả gửi.
async function saveToSentFolder(raws) {
    if (raws.length === 0) return [];

    // Lazy-load để không nạp imapflow khi không bật tính năng
    const { ImapFlow } = require("imapflow");
    const client = new ImapFlow(imapConfig());
    client.on("error", err => console.error("IMAP error:", err.message));

    const saved = raws.map(() => false);
    try {
        await client.connect();
        const folder = await resolveSentFolder(client);
        for (let i = 0; i < raws.length; i++) {
            try {
                await client.append(folder, raws[i], ["\\Seen"]);
                saved[i] = true;
            } catch (err) {
                console.error("saveToSentFolder append error:", err.message);
            }
        }
    } catch (err) {
        console.error("saveToSentFolder error:", err.message);
    } finally {
        await client.logout().catch(() => {});
    }
    return saved;
}

// Dựng sẵn mail thành raw MIME để bản gửi đi và bản lưu vào Sent giống hệt nhau (cùng Message-ID)
async function composeRaw(mail) {
    const node = new MailComposer(mail).compile();
    return { raw: await node.build(), envelope: node.getEnvelope() };
}

async function sendTemplatedEmail({ to, subject, templateName, data }) {
    const transporter = createTransporter();
    const template = getTemplate(templateName);
    const html = template(data);

    const { raw, envelope } = await composeRaw({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
    });

    const info = await transporter.sendMail({ envelope, raw });

    if (process.env.IMAP_SAVE_SENT === "true") {
        [info.savedToSent] = await saveToSentFolder([raw]);
    }
    return info;
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
// Khi bật IMAP_SAVE_SENT, mỗi kết quả thành công có thêm value.savedToSent (true/false).
async function sendBatchTemplatedEmails({ items, templateName }) {
    if (!items || items.length === 0) return [];

    const template = getTemplate(templateName);
    const transporter = nodemailer.createTransport(
        smtpConfig({ pool: true, maxConnections: 3 })
    );

    const raws = [];
    let results;
    try {
        results = await Promise.allSettled(
            items.map(async (item, i) => {
                const { raw, envelope } = await composeRaw({
                    from: process.env.MAIL_FROM || process.env.SMTP_USER,
                    to: item.to,
                    subject: item.subject,
                    html: template(item.data),
                });
                raws[i] = raw;
                return transporter.sendMail({ envelope, raw });
            })
        );
    } finally {
        transporter.close();
    }

    if (process.env.IMAP_SAVE_SENT === "true") {
        // Chỉ lưu những mail đã gửi thành công
        const sentIndexes = results
            .map((r, i) => (r.status === "fulfilled" ? i : -1))
            .filter(i => i >= 0);
        const saved = await saveToSentFolder(sentIndexes.map(i => raws[i]));
        sentIndexes.forEach((idx, k) => {
            results[idx].value.savedToSent = saved[k];
        });
    }

    return results;
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