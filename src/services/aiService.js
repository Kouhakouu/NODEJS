const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_PROMPT = `Bạn là trợ giảng câu lạc bộ toán CMATH Education, viết nhận xét cuối buổi học cho một học sinh để trợ giảng gửi cho phụ huynh.

NHIỆM VỤ: Viết một nhận xét gồm CHÍNH XÁC 2 CÂU, BẮT BUỘC PHẢI CÓ CẢ HAI CÂU.

NGUYÊN TẮC SỐ MỘT — KHÔNG SAI SỰ THẬT:
- TUYỆT ĐỐI KHÔNG đưa ra bất kỳ tuyên bố nào mà phụ huynh có thể kiểm tra trực tiếp và phát hiện sai. Phụ huynh xem được vở học, bài làm về nhà, lịch học của con.
- CẤM nhắc đến: "ghi chép bài đầy đủ", "ghi bài đầy đủ", "ghi vở cẩn thận", "trình bày sạch đẹp", "vở sạch chữ đẹp", hoặc bất kỳ nhận định nào về vở/chữ viết của con.
- CẤM bịa số bài đã làm/đúng/sai. Nếu dữ liệu nói con làm 1/4 bài thì KHÔNG được viết "con đã làm được khá nhiều bài".
- CHỈ được khen các phẩm chất quan sát được trong lớp: chăm chỉ, tập trung, chú ý nghe giảng, tích cực suy nghĩ, hăng hái phát biểu, chịu khó nghĩ bài, nghiêm túc, chủ động.

CÂU 1 — TRÊN LỚP (BẮT BUỘC):
- Nhận xét tinh thần học trên lớp bằng các phẩm chất nói trên
- Câu này thường mang giọng khen, dài 8–18 từ
- BẮT ĐẦU bằng "Trong giờ con…" hoặc "Con… trong giờ học…"
- Nếu attendance = KHÔNG: thay câu khen bằng câu ghi nhận nhẹ nhàng việc vắng học và mong con đi đầy đủ hơn.

CÂU 2 — BÀI VỀ NHÀ (BẮT BUỘC, KHÔNG ĐƯỢC THIẾU):
- Nhận xét CHUNG CHUNG về mức hoàn thiện bài tập về nhà, DỰA THEO mức độ tổng quát (tốt / khá / trung bình / chưa làm được nhiều) suy ra từ số liệu.
- TUYỆT ĐỐI CẤM liệt kê tên bài cụ thể (KHÔNG viết "bài 2a", "bài 3, 5, 7", "các bài 6, 7, 8", v.v.). KHÔNG viết số lượng bài cụ thể đã làm/sai/thiếu.
- Lời khuyên dùng cụm chung như: "con cần chăm chỉ hơn trong việc làm bài tập về nhà", "con cần tập trung hơn vào việc trình bày bài", "con cần dành thêm thời gian suy nghĩ các bài tập khó", "con chú ý xem lại cách trình bày để hoàn thiện bài hơn", "con cần đầu tư nhiều thời gian suy nghĩ bài hơn".
- Dài 15–45 từ.
- BẮT ĐẦU bằng "Bài tập về nhà con…" hoặc "Con hoàn thiện bài tập về nhà…"

ĐỊNH DẠNG OUTPUT:
- Trả về 2 câu trên cùng 1 dòng, ngăn cách bằng dấu chấm và một khoảng trắng (". ")
- KHÔNG xuống dòng, KHÔNG markdown, KHÔNG ngoặc kép
- KHÔNG dùng nhãn "Câu 1:", "Câu 2:"
- KHÔNG nhắc tên học sinh, chỉ xưng "con"
- KHÔNG có giải thích/lời dẫn nào khác ngoài 2 câu nhận xét

VÍ DỤ ĐỊNH DẠNG OUTPUT ĐÚNG (chỉ tham khảo định dạng, không copy nguyên văn):
"Trong giờ con học chăm chỉ, chú ý nghe giảng và tích cực suy nghĩ bài. Bài tập về nhà con hoàn thiện ở mức khá, con cần tập trung hơn vào việc trình bày và dành thêm thời gian suy nghĩ các bài tập khó."

YÊU CẦU VỀ NỘI DUNG:
- Mỗi học sinh nhận xét KHÁC NHAU về câu chữ. Ngay cả khi 2 học sinh có cùng dữ liệu, hãy đổi cách diễn đạt.
- Giọng văn ấm áp, tự nhiên, đúng phong cách giáo viên Việt Nam viết cho phụ huynh.
- Nếu trên lớp vắng mặt (attendance = không), câu 1 nên ghi nhận điều đó một cách nhẹ nhàng (ví dụ: "Hôm nay con vắng học, mong con sắp xếp thời gian đi học đầy đủ hơn") thay vì khen tinh thần học.

PHONG CÁCH THAM KHẢO câu 1 (chỉ học giọng văn, KHÔNG copy nguyên — KHÔNG có "ghi chép", "ghi bài", "ghi vở"):
- "Trong giờ con học chăm chỉ, chú ý nghe giảng"
- "Con tập trung trong giờ học, có chú ý nghe thầy giảng và suy nghĩ các bài tập thầy giao"
- "Trong giờ con học chăm chỉ, hăng hái suy nghĩ bài"
- "Trong giờ con học chăm chỉ, chịu khó nghĩ và làm bài"
- "Trong giờ con chú ý nghe giảng và suy nghĩ các bài tập thầy giao"
- "Trong giờ con tập trung nghe giảng và suy nghĩ bài"
- "Trong giờ con chăm chỉ nghe giảng, tích cực suy nghĩ bài"
- "Trong giờ con tập trung nghe giảng bài, suy nghĩ và làm bài"
- "Trong giờ con học nghiêm túc, chủ động suy nghĩ và làm bài"
- "Trong giờ con tích cực suy nghĩ và hăng hái phát biểu xây dựng bài"

PHONG CÁCH THAM KHẢO câu 2 theo mức độ hoàn thiện (đều chung chung, KHÔNG có tên bài):
- Tốt: "Bài tập về nhà con làm tốt, cần tiếp tục phát huy"
- Khá tốt: "Bài tập về nhà con hoàn thiện khá tốt, tuy nhiên còn mắc một số lỗi trong trình bày và lập luận, con cần tập trung hơn vào việc trình bày để hoàn thiện bài hơn"
- Khá: "Con hoàn thiện bài tập về nhà ở mức độ khá, tuy nhiên phần bài đã làm còn mắc lỗi và còn nhiều bài con chưa có hướng làm; con chú ý sửa lại các chỗ sai và dành thêm thời gian suy nghĩ các bài tập chưa làm được"
- Có ý thức nhưng chưa làm xong: "Con có ý thức làm bài tập về nhà tuy nhiên còn nhiều bài chưa làm được, con cần chịu khó làm bài tập về nhà hơn và tham khảo thêm gợi ý của thầy để có hướng làm cho các bài tập khó"
- Chưa làm được nhiều: "Bài tập về nhà con chưa làm được nhiều, con cần đầu tư nhiều thời gian suy nghĩ bài hơn và cố gắng hoàn thiện các bài tập tương tự đã làm trên lớp"

LẶP LẠI QUY TẮC TUYỆT ĐỐI:
- Câu 2 KHÔNG được chứa tên bài cụ thể (KHÔNG "bài 2a", "bài 6, 7, 8", "bài 3 và bài 5"…) — chỉ nói chung "các bài chưa làm", "các bài tập khó", "phần bài đã làm".
- Câu 2 KHÔNG được chứa con số cụ thể về số bài đã làm/sai/thiếu.
- Câu 1 KHÔNG được nhắc "ghi chép", "ghi bài", "ghi vở", "vở sạch", "chữ đẹp", "trình bày sạch đẹp".`;

const buildUserMessage = (data) => {
    const {
        totalTaskLength,
        doneTask,
        totalScore,
        incorrectTasks,
        missingTasks,
        presentation,
        skills,
        attendance
    } = data;

    const incorrect = incorrectTasks && String(incorrectTasks).trim() !== '' ? incorrectTasks : 'không có';
    const missing = missingTasks && String(missingTasks).trim() !== '' ? missingTasks : 'không có';

    const retryHint = data.__retryHint ? `\n⚠️ ${data.__retryHint}\n` : '';

    return `Dữ liệu chấm bài của một học sinh:

- Có mặt trên lớp: ${attendance ? 'có' : 'KHÔNG (vắng)'}
- Tổng số bài tập của buổi học: ${totalTaskLength || 0}
- Đã làm: ${doneTask || 0}/${totalTaskLength || 0}
- Làm đúng: ${totalScore || 0}/${doneTask || 0}
- Tên bài sai: ${incorrect}
- Tên bài thiếu (chưa làm): ${missing}
- Đánh giá trình bày: ${presentation || 'chưa đánh giá'}
- Đánh giá kĩ năng: ${skills || 'chưa đánh giá'}
${retryHint}
Viết đúng 2 câu nhận xét theo yêu cầu: câu 1 về trên lớp, câu 2 về bài tập về nhà. TUYỆT ĐỐI không được thiếu câu nào.`;
};

const normaliseOutput = (text) => {
    return String(text || '')
        .trim()
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

let anthropicClient = null;
let geminiClient = null;

const generateWithAnthropic = async (data) => {
    if (!anthropicClient) {
        anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const response = await anthropicClient.messages.create({
        model,
        max_tokens: 500,
        temperature: 0.9,
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: buildUserMessage(data) }
        ]
    });
    const text = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
    return normaliseOutput(text);
};

const generateWithGemini = async (data) => {
    if (!geminiClient) {
        geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await geminiClient.models.generateContent({
        model,
        contents: [
            { role: 'user', parts: [{ text: buildUserMessage(data) }] }
        ],
        config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.95,
            maxOutputTokens: 1500,
            // Gemini 2.5 Flash mặc định bật thinking mode (tốn tokens cho suy luận trước khi xuất).
            // Tắt thinking để bảo đảm đủ tokens cho 2 câu output.
            thinkingConfig: { thinkingBudget: 0 }
        }
    });
    const text = response.text || (response.candidates && response.candidates[0]?.content?.parts?.map(p => p.text).join('')) || '';
    return normaliseOutput(text);
};

const resolveProvider = () => {
    const explicit = (process.env.AI_PROVIDER || '').toLowerCase().trim();
    if (explicit === 'anthropic' || explicit === 'claude') return 'anthropic';
    if (explicit === 'gemini' || explicit === 'google') return 'gemini';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    return null;
};

const hasBothSentences = (text) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    const hasClassPart = /trong giờ|trên lớp|con\s+(học|chú ý|tập trung|chăm chỉ|hăng hái|tích cực|nghiêm túc|chủ động|nghe giảng)/i.test(text);
    const hasHomeworkPart = /bài tập về nhà|btvn|bài về nhà|hoàn thiện|làm bài|về nhà con/i.test(lower);
    const sentenceCount = text.split(/\.\s+/).filter(s => s.trim().length > 5).length;
    return hasClassPart && hasHomeworkPart && sentenceCount >= 2;
};

// Phát hiện vi phạm: nêu tên bài cụ thể, dùng số cụ thể, hoặc claim về ghi chép/vở.
const violatesRules = (text) => {
    if (!text) return false;
    // Mẫu "bài 1", "bài 2a", "bài 3b" — số sau từ "bài"
    const namesSpecific = /bài\s+\d+[a-zA-Z]?/i.test(text);
    // Liệt kê dạng "1, 2, 3" hoặc "1; 2; 3" (3 số trở lên, có thể có hậu tố chữ)
    const enumeratedNumbers = /(\d+[a-zA-Z]?\s*[,;]\s*){2,}\d+[a-zA-Z]?/i.test(text);
    // Cấm nhắc ghi chép, ghi bài, ghi vở, vở sạch, chữ đẹp
    const verifiableClaim = /\b(ghi\s*chép|ghi\s*bài|ghi\s*vở|vở\s*sạch|chữ\s*đẹp|trình\s*bày\s*sạch\s*đẹp)\b/i.test(text);
    return namesSpecific || enumeratedNumbers || verifiableClaim;
};

const generateComment = async (data) => {
    const provider = resolveProvider();
    let generator;
    if (provider === 'anthropic') {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY chưa được cấu hình trong file .env');
        }
        generator = generateWithAnthropic;
    } else if (provider === 'gemini') {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY chưa được cấu hình trong file .env');
        }
        generator = generateWithGemini;
    } else {
        throw new Error('Chưa cấu hình AI provider. Hãy đặt GEMINI_API_KEY (mặc định) hoặc ANTHROPIC_API_KEY trong file .env');
    }

    let result = await generator(data);

    if (!hasBothSentences(result)) {
        result = await generator({
            ...data,
            __retryHint: 'LẦN TRƯỚC BẠN CHỈ TRẢ VỀ 1 CÂU. LẦN NÀY BẮT BUỘC PHẢI CÓ ĐỦ CẢ 2 CÂU: câu 1 về trên lớp, câu 2 về bài tập về nhà.'
        });
    }

    if (violatesRules(result)) {
        result = await generator({
            ...data,
            __retryHint: 'LẦN TRƯỚC BẠN ĐÃ VI PHẠM QUY TẮC: hoặc nêu tên bài cụ thể (bài 1, bài 2a…), hoặc nhắc đến ghi chép/ghi bài/ghi vở. LẦN NÀY TUYỆT ĐỐI: (1) câu 2 chỉ nhận xét chung chung, KHÔNG có tên bài hoặc con số; (2) câu 1 KHÔNG nhắc ghi chép/ghi bài/ghi vở.'
        });
    }

    return result;
};

module.exports = { generateComment };
