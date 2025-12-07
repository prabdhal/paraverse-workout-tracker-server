import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import workoutRoutes from "./routes/workout.routes";
import programRoutes from "./routes/program.routes";
import exerciseRoutes from "./routes/exercise.routes";
import analyticsRoutes from "./routes/analytics.routes";
import profileRoutes from "./routes/profile.routes";
import workoutLogRoutes from "./routes/workoutLog.routes";
import { authenticateToken } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://paraverse-workout-tracker.vercel.app",
  "https://paraverse-workout-tracker-*.vercel.app",
  // Add mobile-specific origins
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  // Add your vercel deployment URL
  "https://paraverse-workout-tracker.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some((allowedOrigin) => {
          // Exact match
          if (origin === allowedOrigin) return true;

          // Wildcard match for preview deployments
          if (allowedOrigin.includes("*")) {
            const pattern = allowedOrigin.replace("*", ".*");
            return new RegExp(pattern).test(origin);
          }

          return false;
        })
      ) {
        return callback(null, true);
      } else {
        console.log(`CORS blocked for origin: ${origin}`);
        return callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "ParaVerse API is running! 🚀",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Documentation - Update to include workout-logs
app.get("/api", (req, res) => {
  res.json({
    name: "ParaVerse Fitness API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me",
      },
      workoutLogs: {
        list: "GET /api/workout-logs",
        create: "POST /api/workout-logs",
        get: "GET /api/workout-logs/:id",
        update: "PUT /api/workout-logs/:id",
        delete: "DELETE /api/workout-logs/:id",
        finish: "POST /api/workout-logs/:id/finish",
        stats: "GET /api/workout-logs/stats/summary",
      },
      workouts: {
        list: "GET /api/workouts",
        create: "POST /api/workouts",
        get: "GET /api/workouts/:id",
        update: "PUT /api/workouts/:id",
        delete: "DELETE /api/workouts/:id",
        finish: "POST /api/workouts/:id/finish",
        stats: "GET /api/workouts/stats/summary",
      },
      programs: {
        list: "GET /api/programs",
        create: "POST /api/programs",
        get: "GET /api/programs/:id",
        update: "PUT /api/programs/:id",
        delete: "DELETE /api/programs/:id",
        start: "POST /api/programs/:id/start",
        active: "GET /api/programs/active/current",
      },
      exercises: {
        list: "GET /api/exercises",
        create: "POST /api/exercises",
        get: "GET /api/exercises/:id",
        update: "PUT /api/exercises/:id",
        delete: "DELETE /api/exercises/:id",
        search: "GET /api/exercises/search/autocomplete",
      },
      analytics: {
        workouts: "GET /api/analytics/workouts",
        streak: "GET /api/analytics/streak",
        volume: "GET /api/analytics/volume",
      },
      profile: {
        get: "GET /api/profile",
        update: "PUT /api/profile",
        public: "GET /api/profile/:userId",
      },
    },
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/workouts", authenticateToken, workoutRoutes);
app.use("/api/programs", authenticateToken, programRoutes);
app.use("/api/exercises", authenticateToken, exerciseRoutes);
app.use("/api/analytics", authenticateToken, analyticsRoutes);
app.use("/api/profile", authenticateToken, profileRoutes);
app.use("/api/workout-logs", authenticateToken, workoutLogRoutes);

// Protected test route
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({
    message: "This is a protected route!",
    user: req.user,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);

    const status = err.status || 500;
    const message = err.message || "Internal server error";

    res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api`);
  console.log(`✅ Backend APIs Ready!`);
});
