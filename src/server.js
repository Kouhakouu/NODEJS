import express from "express";
import cors from 'cors';
import bodyParser from "body-parser";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./routes/web";
import connectDB from "./config/connectDB";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


viewEngine(app);
initWebRoutes(app);
connectDB()

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Backend Node.js is running on port ${port}`);
});
