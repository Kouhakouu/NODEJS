function safeStr(v, fallback = "-") {
    if (v === null || v === undefined) return fallback;
    const s = String(v);
    return s.trim().length ? s : fallback;
}

function formatDateVN(dateLike) {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return safeStr(dateLike, "-");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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

module.exports = { safeStr, formatDateVN, jsonToText };