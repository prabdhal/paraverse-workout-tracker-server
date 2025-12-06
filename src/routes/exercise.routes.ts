// routes/exercise.routes.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get all exercises with filtering
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { muscleGroup, category, limit = 50, offset = 0 } = req.query;

    const where: any = {
      OR: [{ custom: false }, { createdBy: req.user!.userId }],
    };

    if (muscleGroup) {
      where.OR = [
        { primaryMuscleGroup: muscleGroup as string },
        { secondaryMuscleGroups: { has: muscleGroup as string } },
      ];
    }

    if (category) {
      where.category = category as string;
    }

    const exercises = await prisma.exercise.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: exercises,
      pagination: {
        total: await prisma.exercise.count({ where }),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error("Get exercises error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exercises",
    });
  }
});

// Search exercises
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { query, muscleGroup, limit = 20 } = req.query;

    if (!query || (query as string).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const where: any = {
      OR: [{ custom: false }, { createdBy: req.user!.userId }],
      name: {
        contains: query as string,
        mode: "insensitive",
      },
    };

    if (muscleGroup) {
      where.OR = [
        { primaryMuscleGroup: muscleGroup as string },
        { secondaryMuscleGroups: { has: muscleGroup as string } },
      ];
    }

    const exercises = await prisma.exercise.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { name: "asc" },
    });

    res.json(exercises);
  } catch (error) {
    console.error("Search exercises error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search exercises",
    });
  }
});

// Get exercise by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found",
      });
    }

    // Check if user can view custom exercise
    if (exercise.custom && exercise.createdBy !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this exercise",
      });
    }

    res.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    console.error("Get exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exercise",
    });
  }
});

// Create custom exercise
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      primaryMuscleGroup,
      secondaryMuscleGroups,
      equipment,
      imageUrl,
      videoUrl,
      category,
    } = req.body;

    // Check if exercise already exists
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        name,
        custom: false,
      },
    });

    if (existingExercise) {
      return res.status(409).json({
        success: false,
        message: "Exercise with this name already exists",
      });
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        description,
        primaryMuscleGroup,
        secondaryMuscleGroups,
        equipment,
        imageUrl,
        videoUrl,
        category,
        custom: true,
        createdBy: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Exercise created successfully",
      data: exercise,
    });
  } catch (error) {
    console.error("Create exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create exercise",
    });
  }
});

// Update custom exercise (only for user's own custom exercises)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found",
      });
    }

    if (!exercise.custom || exercise.createdBy !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own custom exercises",
      });
    }

    const updatedExercise = await prisma.exercise.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      success: true,
      message: "Exercise updated successfully",
      data: updatedExercise,
    });
  } catch (error) {
    console.error("Update exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update exercise",
    });
  }
});

// Delete custom exercise
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: "Exercise not found",
      });
    }

    if (!exercise.custom || exercise.createdBy !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own custom exercises",
      });
    }

    await prisma.exercise.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Exercise deleted successfully",
    });
  } catch (error) {
    console.error("Delete exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete exercise",
    });
  }
});

export default router;
