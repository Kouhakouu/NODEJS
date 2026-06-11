import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./routes/web";
import connectDB from "./config/connectDB";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World! 👋");
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
connectDB();

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Backend Node.js is running on port ${port}`);
});
