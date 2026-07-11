const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenAI } = require('@google/genai');

const AI_TIMEOUT_MS = Math.max(
    3000,
    Number(process.env.AI_TIMEOUT_MS || 12000)
);

const AI_MAX_OUTPUT_TOKENS = Math.max(
    100,
    Number(process.env.AI_MAX_OUTPUT_TOKENS || 220)
);

// Rút gọn prompt vì kết quả chỉ cần đúng 2 câu.
// Không truyền tên bài và số bài cụ thể cho AI để tránh AI vô tình đưa chúng vào output.
const SYSTEM_PROMPT = `
Bạn là trợ giảng tại CMATH Education, viết nhận xét cuối buổi gửi phụ huynh.

Trả về CHÍNH XÁC 2 CÂU trên cùng một dòng.

Câu 1:
- Nhận xét việc học trên lớp.
- Bắt đầu bằng "Trong giờ con..." hoặc "Con... trong giờ học...".
- Nếu học sinh vắng, ghi nhận nhẹ nhàng việc vắng học.
- Không nhắc ghi chép, ghi bài, ghi vở, chữ viết hoặc vở sạch.

Câu 2:
- Nhận xét chung về bài tập về nhà.
- Bắt đầu bằng "Bài tập về nhà con..." hoặc
  "Con hoàn thiện bài tập về nhà...".
- Không nêu tên bài, số bài, số lượng bài đúng, sai hoặc thiếu.
- Chỉ đưa lời khuyên chung về hoàn thiện bài, trình bày và suy nghĩ bài khó.

Quy định:
- Không nhắc tên học sinh, chỉ xưng "con".
- Không dùng chữ số.
- Không markdown, không xuống dòng, không ngoặc kép, không nhãn câu.
- Giọng văn tự nhiên, tích cực và không khẳng định điều không có trong dữ liệu.
`;

let anthropicClient = null;
let geminiClient = null;

const hasValue = (value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null
        && value !== undefined
        && String(value).trim() !== '';
};

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const normaliseOutput = (text) => {
    let result = String(text || '')
        .trim()
        .replace(/^["'`]+|["'`]+$/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.!?;:])/g, '$1')
        .trim();

    if (result && !/[.!?]$/.test(result)) {
        result += '.';
    }

    return result;
};

/**
 * Tự xác định mức hoàn thiện để AI không cần xử lý các con số chi tiết.
 */
const getHomeworkLevel = (data) => {
    const totalTaskLength = toNumber(data.totalTaskLength);
    const doneTask = toNumber(data.doneTask);
    const totalScore = toNumber(data.totalScore);

    if (totalTaskLength <= 0) {
        return 'chưa có đủ dữ liệu để đánh giá';
    }

    const completionRate = doneTask / totalTaskLength;
    const accuracyRate = doneTask > 0 ? totalScore / doneTask : 0;

    if (completionRate >= 0.9 && accuracyRate >= 0.75) {
        return 'tốt';
    }

    if (completionRate >= 0.7) {
        return 'khá';
    }

    if (completionRate >= 0.35) {
        return 'trung bình';
    }

    return 'chưa làm được nhiều';
};

const buildUserMessage = (data) => {
    return [
        `Có mặt trên lớp: ${data.attendance ? 'có' : 'không, học sinh vắng'}`,
        `Mức hoàn thiện bài tập về nhà: ${getHomeworkLevel(data)}`,
        `Có phần làm sai: ${hasValue(data.incorrectTasks) ? 'có' : 'không'}`,
        `Có phần chưa làm: ${hasValue(data.missingTasks) ? 'có' : 'không'}`,
        `Đánh giá trình bày: ${data.presentation || 'chưa đánh giá'}`,
        `Đánh giá kỹ năng: ${data.skills || 'chưa đánh giá'}`,
        '',
        'Hãy viết đúng hai câu nhận xét theo yêu cầu.'
    ].join('\n');
};

const splitTwoSentences = (text) => {
    // Bắt chính xác 2 câu, mỗi câu kết thúc bằng dấu câu.
    const match = String(text || '').match(
        /^(.+?[.!?])\s+(.+?[.!?])$/u
    );

    if (!match) return null;

    return {
        first: match[1].trim(),
        second: match[2].trim()
    };
};

const violatesRules = (text) => {
    if (!text) return true;

    const containsNumber = /\d/.test(text);

    const specificExercise = /bài\s+\d+[a-zA-Z]?/i.test(text);

    const notebookClaim =
        /(ghi\s*chép|ghi\s*bài|ghi\s*vở|vở\s*sạch|chữ\s*đẹp|trình\s*bày\s*sạch\s*đẹp)/i
            .test(text);

    const hasLineBreak = /[\r\n]/.test(text);

    return containsNumber
        || specificExercise
        || notebookClaim
        || hasLineBreak;
};

const isValidComment = (text, attendance) => {
    const sentences = splitTwoSentences(text);
    if (!sentences) return false;

    const validFirstStart = attendance === false
        ? /^(Hôm nay con|Trong giờ con|Con .*trong giờ học)/i.test(sentences.first)
        : /^(Trong giờ con|Con .*trong giờ học)/i.test(sentences.first);

    const validSecondStart =
        /^(Bài tập về nhà con|Con hoàn thiện bài tập về nhà)/i
            .test(sentences.second);

    return validFirstStart
        && validSecondStart
        && !violatesRules(text);
};

const pickBySeed = (items, seed) => {
    const safeSeed = Math.abs(Math.floor(toNumber(seed)));
    return items[safeSeed % items.length];
};

/**
 * Nhận xét dự phòng:
 * - Không cần gọi API ngoài.
 * - Luôn trả về đúng 2 câu.
 * - Được sử dụng khi AI timeout, rate limit hoặc output sai định dạng.
 */
const buildFallbackComment = (data) => {
    const seed =
        toNumber(data.variationSeed)
        + toNumber(data.doneTask) * 17
        + Math.floor(toNumber(data.totalScore) * 11);

    const classComments = data.attendance === false
        ? [
            'Hôm nay con vắng học, mong con sắp xếp thời gian đi học đầy đủ hơn.',
            'Hôm nay con chưa tham gia buổi học, mong con cố gắng đi học đầy đủ trong những buổi tiếp theo.'
        ]
        : [
            'Trong giờ con có mặt đầy đủ và tham gia các hoạt động học tập.',
            'Con có mặt trong giờ học và tham gia các nội dung của buổi học.',
            'Trong giờ con tham gia học cùng lớp và theo dõi các nội dung được hướng dẫn.'
        ];

    const homeworkComments = {
        tốt: [
            'Bài tập về nhà con hoàn thiện tốt, con cần tiếp tục duy trì sự chăm chỉ và kiểm tra lại bài trước khi nộp.',
            'Con hoàn thiện bài tập về nhà khá tốt, con tiếp tục phát huy và chú ý kiểm tra lại phần trình bày.'
        ],
        khá: [
            'Bài tập về nhà con hoàn thiện ở mức khá, con cần xem lại phần chưa chắc và dành thêm thời gian kiểm tra cách trình bày.',
            'Con hoàn thiện bài tập về nhà tương đối tốt, con cần tập trung hơn vào các phần còn sai và kiểm tra bài kỹ hơn.'
        ],
        'trung bình': [
            'Bài tập về nhà con mới hoàn thiện một phần, con cần dành thêm thời gian suy nghĩ và cố gắng hoàn thành các phần còn thiếu.',
            'Con hoàn thiện bài tập về nhà ở mức trung bình, con cần chăm chỉ hơn và xem lại các phần còn chưa chắc.'
        ],
        'chưa làm được nhiều': [
            'Bài tập về nhà con chưa hoàn thiện được nhiều, con cần chăm chỉ hơn và dành thêm thời gian suy nghĩ các bài tập khó.',
            'Con hoàn thiện bài tập về nhà chưa đầy đủ, con cần đầu tư thêm thời gian và cố gắng làm lại các phần chưa hoàn thành.'
        ],
        'chưa có đủ dữ liệu để đánh giá': [
            'Bài tập về nhà con cần được hoàn thiện đầy đủ hơn, con cố gắng duy trì thói quen làm bài và kiểm tra lại trước buổi học.'
        ]
    };

    const level = getHomeworkLevel(data);

    const first = pickBySeed(classComments, seed);
    const second = pickBySeed(
        homeworkComments[level] || homeworkComments['trung bình'],
        seed + 1
    );

    return `${first} ${second}`;
};

const withTimeout = async (promise, timeoutMs, providerName) => {
    let timer;

    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const error = new Error(
                `${providerName} không phản hồi sau ${timeoutMs}ms`
            );
            error.code = 'AI_TIMEOUT';
            reject(error);
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timer);
    }
};

const getAnthropicClient = () => {
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,

            // Không để SDK chờ 10 phút.
            timeout: AI_TIMEOUT_MS,

            // Không tự retry vì phía server phải trả response sớm.
            maxRetries: 0
        });
    }

    return anthropicClient;
};

const getGeminiClient = () => {
    if (!geminiClient) {
        geminiClient = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });
    }

    return geminiClient;
};

const generateWithAnthropic = async (data) => {
    const client = getAnthropicClient();
    const model =
        process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

    const request = client.messages.create({
        model,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content: buildUserMessage(data)
            }
        ]
    });

    const response = await withTimeout(
        request,
        AI_TIMEOUT_MS,
        'Anthropic'
    );

    const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

    return normaliseOutput(text);
};

const generateWithGemini = async (data) => {
    const client = getGeminiClient();
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const request = client.models.generateContent({
        model,
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: buildUserMessage(data)
                    }
                ]
            }
        ],
        config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
            maxOutputTokens: AI_MAX_OUTPUT_TOKENS,

            // Gemini 2.5 không cần suy luận dài cho tác vụ này.
            thinkingConfig: {
                thinkingBudget: 0
            },

            // SDK mới hỗ trợ giới hạn timeout ở request.
            httpOptions: {
                timeout: AI_TIMEOUT_MS
            }
        }
    });

    const response = await withTimeout(
        request,
        AI_TIMEOUT_MS + 500,
        'Gemini'
    );

    const text =
        response.text
        || response.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('')
        || '';

    return normaliseOutput(text);
};

const resolveProvider = () => {
    const explicit = String(process.env.AI_PROVIDER || '')
        .toLowerCase()
        .trim();

    if (explicit === 'anthropic' || explicit === 'claude') {
        return 'anthropic';
    }

    if (explicit === 'gemini' || explicit === 'google') {
        return 'gemini';
    }

    // Code cũ ưu tiên Anthropic dù thông báo nói Gemini là mặc định.
    // Sửa lại để ưu tiên Gemini.
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';

    return null;
};

const generateComment = async (data) => {
    const fallbackComment = buildFallbackComment(data);
    const provider = resolveProvider();

    if (!provider) {
        console.warn('[AI] Không có API key, sử dụng nhận xét dự phòng');
        return fallbackComment;
    }

    const startedAt = Date.now();

    try {
        const generator = provider === 'anthropic'
            ? generateWithAnthropic
            : generateWithGemini;

        // Chỉ gọi provider đúng một lần.
        const result = await generator(data);

        const durationMs = Date.now() - startedAt;

        if (!isValidComment(result, data.attendance !== false)) {
            console.warn(
                `[AI] Output không hợp lệ, provider=${provider}, `
                + `durationMs=${durationMs}, output=${result}`
            );

            return fallbackComment;
        }

        console.log(
            `[AI] Thành công provider=${provider}, durationMs=${durationMs}`
        );

        return result;
    } catch (error) {
        console.error(
            `[AI] Provider lỗi, dùng fallback. `
            + `provider=${provider}, durationMs=${Date.now() - startedAt}`,
            {
                name: error.name,
                code: error.code,
                status: error.status,
                message: error.message
            }
        );

        // Không trả lỗi 500 và không tiếp tục gọi AI lần hai.
        return fallbackComment;
    }
};

module.exports = {
    generateComment
};