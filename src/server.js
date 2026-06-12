import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./routes/web";
import db from "./models/index";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World! 👋");
});

// Keep-warm: đánh thức cả serverless function lẫn Neon (auto-suspend sau ~5 phút).
// Frontend ping khi mở trang login; nên đăng ký thêm cron ngoài (cron-job.org) gọi mỗi 4 phút.
app.get("/health", async (_req, res) => {
    try {
        await db.sequelize.query("SELECT 1");
        return res.json({ ok: true });
    } catch (err) {
        console.error("Health check failed:", err.message);
        return res.status(500).json({ ok: false });
    }
});

app.use(cors({
    origin: ["http://localhost:3000", "https://reactjs-cmath.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

viewEngine(app);

// Đăng ký route cho authentication trước khi các route khác
app.use("/auth", authRoutes);

initWebRoutes(app);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Backend Node.js is running on port ${port}`);
});
