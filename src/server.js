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

const corsOptions = {
    origin: ["http://localhost:3000", "https://reactjs-cmath.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
};

// Phải đặt CORS trước tất cả routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Hello World! 👋");
});

app.get("/health", async (_req, res) => {
    try {
        await db.sequelize.query("SELECT 1");
        return res.json({ ok: true });
    } catch (err) {
        console.error("Health check failed:", err.message);
        return res.status(500).json({ ok: false });
    }
});

viewEngine(app);

app.use("/auth", authRoutes);

initWebRoutes(app);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Backend Node.js is running on port ${port}`);
});