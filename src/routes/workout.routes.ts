import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get all workouts for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const workouts = await prisma.workoutLog.findMany({
      where: { userId: req.user!.userId },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    res.json({
      success: true,
      data: workouts,
      count: workouts.length,
    });
  } catch (error) {
    console.error("Get workouts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workouts",
    });
  }
});

// Get single workout
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const workout = await prisma.workoutLog.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        message: "Workout not found",
      });
    }

    res.json({
      success: true,
      data: workout,
    });
  } catch (error) {
    console.error("Get workout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workout",
    });
  }
});

// Create workout
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      workoutType,
      workoutName,
      exercises,
      programId,
      dayId,
      tags,
      calculatedMetrics,
    } = req.body;

    const workout = await prisma.workoutLog.create({
      data: {
        userId: req.user!.userId,
        workoutType,
        workoutName,
        startTime: new Date(),
        exercises: {
          create: exercises.map((exercise: any) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            order: exercise.order,
            notes: exercise.notes,
            programExerciseId: exercise.programExerciseId,
            sets: {
              create: exercise.sets.map((set: any) => ({
                setNumber: set.setNumber,
                reps: set.reps,
                weight: set.weight,
                completed: set.completed,
                rpe: set.rpe,
                notes: set.notes,
              })),
            },
          })),
        },
        programId,
        dayId,
        tags,
        calculatedMetrics,
        completed: false,
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Workout created successfully",
      data: workout,
    });
  } catch (error) {
    console.error("Create workout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create workout",
    });
  }
});

// Update workout
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const {
      workoutName,
      exercises,
      endTime,
      completed,
      tags,
      calculatedMetrics,
    } = req.body;

    // Check if workout exists and belongs to user
    const existingWorkout = await prisma.workoutLog.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!existingWorkout) {
      return res.status(404).json({
        success: false,
        message: "Workout not found",
      });
    }

    // Update workout
    const workout = await prisma.workoutLog.update({
      where: { id: req.params.id },
      data: {
        workoutName,
        endTime: endTime ? new Date(endTime) : undefined,
        completed,
        tags,
        calculatedMetrics,
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Workout updated successfully",
      data: workout,
    });
  } catch (error) {
    console.error("Update workout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workout",
    });
  }
});

// Finish workout
router.post("/:id/finish", authenticateToken, async (req, res) => {
  try {
    const { calculatedMetrics } = req.body;

    const workout = await prisma.workoutLog.update({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      data: {
        endTime: new Date(),
        completed: true,
        calculatedMetrics,
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    // Update program progress if this is a program workout
    if (workout.programId && workout.dayId) {
      await prisma.activeProgram.updateMany({
        where: {
          programId: workout.programId,
          userId: req.user!.userId,
        },
        data: {
          progressPercentage: {
            increment: calculateProgressIncrement(),
          },
        },
      });
    }

    res.json({
      success: true,
      message: "Workout completed successfully",
      data: workout,
    });
  } catch (error) {
    console.error("Finish workout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to finish workout",
    });
  }
});

// Delete workout
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    // Check if workout exists and belongs to user
    const existingWorkout = await prisma.workoutLog.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!existingWorkout) {
      return res.status(404).json({
        success: false,
        message: "Workout not found",
      });
    }

    await prisma.workoutLog.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Workout deleted successfully",
    });
  } catch (error) {
    console.error("Delete workout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete workout",
    });
  }
});

// Get workout statistics
router.get("/stats/summary", authenticateToken, async (req, res) => {
  try {
    const workouts = await prisma.workoutLog.findMany({
      where: {
        userId: req.user!.userId,
        completed: true,
      },
      include: {
        exercises: {
          include: { sets: true },
        },
      },
    });

    // Calculate stats
    const stats = {
      totalWorkouts: workouts.length,
      totalVolume: workouts.reduce(
        (sum, w) => sum + (w.calculatedMetrics?.totalVolume || 0),
        0
      ),
      averageWorkoutsPerWeek: calculateAverageWorkoutsPerWeek(workouts),
      currentStreak: calculateStreak(workouts),
      favoriteExercise: findMostFrequentExercise(workouts),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

// Helper functions
function calculateProgressIncrement(): number {
  // Calculate based on program structure
  return 5; // Example: 5% per workout
}

function calculateAverageWorkoutsPerWeek(workouts: any[]): number {
  // Implementation
  return 3;
}

function calculateStreak(workouts: any[]): number {
  // Implementation
  return 7;
}

function findMostFrequentExercise(workouts: any[]): string {
  // Implementation
  return "Bench Press";
}

export default router;
