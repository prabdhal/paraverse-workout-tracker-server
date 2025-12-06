import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const workoutSchema = z.object({
  name: z.string().min(1, "Workout name is required"),
  type: z.enum(["program", "custom"]),
  startTime: z.string().datetime(),
  exercises: z.array(z.any()).min(1, "At least one exercise is required"),
});

// Validation middleware
export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    registerSchema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors,
    });
  }
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    loginSchema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors,
    });
  }
};

export const validateWorkout = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    workoutSchema.parse(req.body);
    next();
  } catch (error: any) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors,
    });
  }
};
