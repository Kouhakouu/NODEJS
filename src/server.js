require('dotenv').config(); // Load env vars first
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require('path'); // Needed for static files if you serve them

const viewEngine = require("./config/viewEngine");
const initWebRoutes = require("./routes/web");
const connectDB = require("./config/connectDB");
const authRoutes = require("./routes/auth.js"); // Assuming auth.js uses CommonJS too

const app = express();

const allowedOrigins = [
    'http://localhost:3000', // Your local frontend
];

const corsOptions = {
    origin: process.env.CORS_ORIGIN || "*", // More flexible: Use env var or allow all (*) - adjust security as needed!
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

viewEngine(app); // Configure EJS (ensure views path is correct relative to runtime)
connectDB();   // Attempt database connection

app.use(express.static(path.join(__dirname, 'public')));

app.use("/auth", authRoutes);
initWebRoutes(app);

app.use((req, res) => {
    res.status(404).send("Vercel Function Not Found (Internal App Route)");
});

module.exports = app;
