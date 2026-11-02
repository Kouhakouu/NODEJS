function safeStr(v, fallback = "-") {
    if (v === null || v === undefined) return fallback;
    const s = String(v);
    return s.trim().length ? s : fallback;
}

// Luôn format theo giờ VN: ngày buổi học lưu là 00:00 giờ VN (= 17:00 UTC hôm trước),
// nên nếu dùng getDate() trên server chạy UTC sẽ bị lùi 1 ngày.
const VN_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

function vnDateParts(d) {
    return Object.fromEntries(VN_DATE_FORMAT.formatToParts(d).map(p => [p.type, p.value]));
}

function formatDateVN(dateLike) {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return safeStr(dateLike, "-");
    const parts = vnDateParts(d);
    return `${parts.day}/${parts.month}/${parts.year}`;
}

// Trả về [năm, tháng, ngày] (số) theo giờ VN
function toVNYmd(dateLike) {
    const { year, month, day } = vnDateParts(new Date(dateLike));
    return [Number(year), Number(month), Number(day)];
}

function jsonToText(v) {
    // incorrectTasks/missingTasks của bạn là JSON
    // có thể là [] hoặc ["b1","b2"] hoặc string
    if (v === null || v === undefined) return "-";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
    if (typeof v === "string") return v.trim() ? v : "-";
    try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.length ? parsed.join(", ") : "-";
        return safeStr(parsed, "-");
    } catch {
        return safeStr(v, "-");
    }
}

module.exports = { safeStr, formatDateVN, toVNYmd, jsonToText };