require('dotenv').config({ path: './.env' });

const dns = require('dns');
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const logger = require('./utils/logger');

const indexRouter = require('./routes/index.routes');

require("./utils/config.db")();
require("./utils/admin.autoregister").AdminRegisterAuto();

// ✅ ACTIVE CRONS
require("./cron/monthly.roi.cron");
require("./cron/rankRoyalty.cron");
require("./cron/combined.daily.cron");

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:1437",
  "http://localhost:1438",
  "https://bittrade7.online",    // 👈 Main frontend domain
  "https://www.bittrade7.online" // 👈 Admin frontend domain ya www wali site
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed for this origin"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(logger.httpLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

if (!process.env.SESSION_SECRET) {
  logger.error("SESSION_SECRET is required in .env");
  process.exit(1);
}

// --- SESSION CONFIG ---
app.use(session({
  name: "bsafe",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE_URL
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Production mein true hona chahiye
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Routes
app.get("/api", (req, res) => {
    res.json({ success: true, message: "Server is running successfully!" });
});

app.use('/api', indexRouter);
app.use("/api/dummy", require("./routes/dummy.route"));
app.use("/api/roi-test", require("./routes/roiTest.route"));

// 404 Handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error Handler
app.use(function (err, req, res, next) {
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// --- SERVER LISTEN ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server is flying on port ${PORT}`, {
    nodeEnv: process.env.NODE_ENV,
    url: `http://localhost:${PORT}`
  });
});

module.exports = app;
