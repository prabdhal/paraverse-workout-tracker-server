import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("=== AUTHENTICATE TOKEN MIDDLEWARE ===");
  console.log("Request path:", req.path);
  console.log("Authorization header exists:", !!authHeader);
  console.log(
    "Token extracted:",
    token ? `${token.substring(0, 50)}...` : "none"
  );

  if (!token) {
    console.log("❌ ERROR: No token provided");
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    console.log("🔑 Verifying token with JWT_SECRET...");
    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };

    console.log("✅ Token verified successfully");
    console.log("👤 Decoded user ID:", decoded.userId);
    console.log("📧 Decoded email:", decoded.email);

    req.user = decoded;
    next();
  } catch (error: any) {
    console.log("❌ Token verification failed");
    console.log("Error name:", error.name);
    console.log("Error message:", error.message);

    if (error.name === "TokenExpiredError") {
      console.log("⏰ Token expired at:", error.expiredAt);
      return res.status(401).json({
        success: false,
        message: "Token expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
};

// Check if user is program creator
export const isProgramCreator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { programId } = req.params;
    const { userId } = req.user!;

    // You'll need to implement this check based on your database
    // For now, we'll pass through
    next();
  } catch (error) {
    next(error);
  }
};
