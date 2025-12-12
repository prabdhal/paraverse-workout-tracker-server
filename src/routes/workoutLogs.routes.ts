import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get all workout logs for user
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const workoutLogs = await prisma.workoutLog.findMany({
      where: { userId },
      include: {
        exerciseLogs: {
          include: {
            sets: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    res.json({
      success: true,
      data: workoutLogs,
    });
  } catch (error: any) {
    console.error("Error fetching workout logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workout history",
      error: error.message,
    });
  }
});

// Get single workout log
router.get("/:id", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const workoutLog = await prisma.workoutLog.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        exerciseLogs: {
          include: {
            sets: {
              orderBy: {
                setNumber: "asc",
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!workoutLog) {
      return res.status(404).json({
        success: false,
        message: "Workout log not found",
      });
    }

    res.json({
      success: true,
      data: workoutLog,
    });
  } catch (error: any) {
    console.error("Error fetching workout log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workout log",
      error: error.message,
    });
  }
});

// Create workout log
router.post("/", authenticateToken, async (req: any, res) => {
  let transaction: any = null;

  try {
    console.log("=== WORKOUT LOG CREATE REQUEST ===");
    console.log("User ID:", req.user?.id);
    console.log("User object:", req.user);
    console.log("Request body:", req.body);

    // Check authentication
    if (!req.user?.userId) {
      console.error("ERROR: No user ID in request");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;
    const {
      workoutName,
      workoutType,
      startTime,
      tags = [],
      programId,
      programName,
      dayId,
      dayName,
      exercises = [], // Default to empty array
      endTime,
      completed,
      calculatedMetrics,
    } = req.body;

    // Validate required fields
    if (!workoutName || !workoutType || !startTime) {
      console.error("Missing required fields:", {
        workoutName,
        workoutType,
        startTime,
      });
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: workoutName, workoutType, startTime are required",
      });
    }

    console.log("Creating workout log for user:", userId);
    console.log("Number of exercises:", exercises.length);

    // Use a transaction to ensure all operations succeed or fail together
    transaction = await prisma.$transaction(async (prisma) => {
      // Create workout log
      const workoutLog = await prisma.workoutLog.create({
        data: {
          userId,
          workoutName,
          workoutType,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          completed: completed !== undefined ? completed : false,
          tags,
          programId: programId || null,
          programName: programName || null,
          dayId: dayId || null,
          dayName: dayName || null,
          calculatedMetrics: calculatedMetrics || null,
        },
      });

      console.log("Workout log created with ID:", workoutLog.id);

      // Create exercise logs and sets if provided
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        console.log(`Creating ${exercises.length} exercises...`);

        for (const [index, exercise] of exercises.entries()) {
          console.log(`Creating exercise ${index + 1}:`, exercise.exerciseName);

          const exerciseLog = await prisma.exerciseLog.create({
            data: {
              workoutLogId: workoutLog.id,
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
              order: exercise.order || index,
              notes: exercise.notes || null,
              programExerciseId: exercise.programExerciseId || null,
            },
          });

          console.log(`Exercise ${index + 1} created with ID:`, exerciseLog.id);

          // Create sets if provided
          if (exercise.sets && Array.isArray(exercise.sets)) {
            console.log(`Creating ${exercise.sets.length} sets...`);

            for (const [setIndex, set] of exercise.sets.entries()) {
              await prisma.setLog.create({
                data: {
                  exerciseLogId: exerciseLog.id,
                  setNumber: set.setNumber || setIndex + 1,
                  reps: set.reps || 0,
                  weight: set.weight || 0,
                  completed: set.completed || false,
                  rpe: set.rpe || null,
                  notes: set.notes || null,
                },
              });
            }
          }
        }
      }

      // Return the complete workout log with relations
      return await prisma.workoutLog.findUnique({
        where: { id: workoutLog.id },
        include: {
          exerciseLogs: {
            include: {
              sets: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    });

    console.log("Transaction completed successfully");

    res.status(201).json({
      success: true,
      data: transaction,
      message: "Workout log created successfully",
    });
  } catch (error: any) {
    console.error("=== CRITICAL ERROR CREATING WORKOUT LOG ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error meta:", error.meta);
    console.error("Error stack:", error.stack);

    // Rollback transaction if it exists
    if (transaction) {
      try {
        await prisma.$executeRaw`ROLLBACK`;
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    // Provide more specific error messages
    let errorMessage = "Failed to create workout log";

    if (error.code === "P2002") {
      errorMessage = "A unique constraint failed. Please check your data.";
    } else if (error.code === "P2003") {
      errorMessage =
        "Foreign key constraint failed. Referenced record does not exist.";
    } else if (error.code === "P2025") {
      errorMessage = "Record not found. Please check your references.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code,
      meta: error.meta,
    });
  }
});

// Update workout log
router.put("/:id", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updates = req.body;

    // Check if workout exists and belongs to user
    const existingWorkout = await prisma.workoutLog.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingWorkout) {
      return res.status(404).json({
        success: false,
        message: "Workout log not found",
      });
    }

    // Update workout log
    const updatedWorkout = await prisma.workoutLog.update({
      where: { id },
      data: {
        workoutName: updates.workoutName,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
        completed: updates.completed,
        tags: updates.tags,
        calculatedMetrics: updates.calculatedMetrics,
      },
      include: {
        exerciseLogs: {
          include: {
            sets: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedWorkout,
      message: "Workout log updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating workout log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workout log",
      error: error.message,
    });
  }
});

// Delete workout log
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Check if workout exists and belongs to user
    const existingWorkout = await prisma.workoutLog.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingWorkout) {
      return res.status(404).json({
        success: false,
        message: "Workout log not found",
      });
    }

    // Delete workout log (cascading delete will handle exercise and set logs)
    await prisma.workoutLog.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Workout log deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting workout log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete workout log",
      error: error.message,
    });
  }
});

// Finish workout (mark as completed with metrics)
router.post("/:id/finish", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { calculatedMetrics } = req.body;

    // Check if workout exists and belongs to user
    const existingWorkout = await prisma.workoutLog.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingWorkout) {
      return res.status(404).json({
        success: false,
        message: "Workout log not found",
      });
    }

    // Update workout as finished
    const updatedWorkout = await prisma.workoutLog.update({
      where: { id },
      data: {
        endTime: new Date(),
        completed: true,
        calculatedMetrics: calculatedMetrics || {},
      },
      include: {
        exerciseLogs: {
          include: {
            sets: true,
          },
        },
      },
    });

    // Update active program progress if this was a program workout
    if (existingWorkout.programId && existingWorkout.dayId) {
      try {
        const activeProgram = await prisma.activeProgram.findFirst({
          where: {
            userId,
            programId: existingWorkout.programId,
            isActive: true,
          },
        });

        if (activeProgram) {
          // Add this workout day to completed workouts
          const completedWorkouts = Array.isArray(
            activeProgram.completedWorkouts
          )
            ? [...activeProgram.completedWorkouts]
            : [];

          if (!completedWorkouts.includes(existingWorkout.dayId)) {
            completedWorkouts.push(existingWorkout.dayId);

            // Update progress percentage
            const program = await prisma.workoutProgram.findUnique({
              where: { id: existingWorkout.programId },
              include: {
                workoutDays: true,
              },
            });

            if (program) {
              const totalDays = program.workoutDays.length;
              const completedDays = completedWorkouts.length;
              const progressPercentage = Math.round(
                (completedDays / totalDays) * 100
              );

              await prisma.activeProgram.update({
                where: { id: activeProgram.id },
                data: {
                  completedWorkouts,
                  progressPercentage,
                  streak: activeProgram.streak + 1,
                },
              });
            }
          }
        }
      } catch (programError) {
        console.error("Error updating program progress:", programError);
        // Don't fail the workout finish if program update fails
      }
    }

    res.json({
      success: true,
      data: updatedWorkout,
      message: "Workout completed successfully",
    });
  } catch (error: any) {
    console.error("Error finishing workout:", error);
    res.status(500).json({
      success: false,
      message: "Failed to finish workout",
      error: error.message,
    });
  }
});

// Get workout statistics/summary
router.get("/stats/summary", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // Get all completed workouts
    const workouts = await prisma.workoutLog.findMany({
      where: {
        userId,
        completed: true,
      },
      include: {
        exerciseLogs: {
          include: {
            sets: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    // Calculate statistics
    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((sum: number, workout: any) => {
      const workoutVolume = workout.exerciseLogs.reduce(
        (exerciseSum: number, exercise: any) => {
          return (
            exerciseSum +
            exercise.sets.reduce((setSum: number, set: any) => {
              return setSum + set.weight * set.reps;
            }, 0)
          );
        },
        0
      );
      return sum + workoutVolume;
    }, 0);

    const averageDuration =
      workouts.length > 0
        ? workouts.reduce((sum, workout) => {
            if (workout.startTime && workout.endTime) {
              const duration =
                (new Date(workout.endTime).getTime() -
                  new Date(workout.startTime).getTime()) /
                (1000 * 60);
              return sum + duration;
            }
            return sum;
          }, 0) / workouts.length
        : 0;

    // Calculate streak
    const streak = calculateStreak(workouts);

    // Weekly volume trend
    const weeklyVolume = calculateWeeklyVolume(workouts);

    res.json({
      success: true,
      data: {
        totalWorkouts,
        totalVolume,
        averageDuration: Math.round(averageDuration),
        currentStreak: streak,
        workoutsThisWeek: workouts.filter((w) =>
          isThisWeek(new Date(w.startTime))
        ).length,
        weeklyVolumeTrend: weeklyVolume,
      },
    });
  } catch (error: any) {
    console.error("Error fetching workout stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workout statistics",
      error: error.message,
    });
  }
});

// Helper function to calculate streak
function calculateStreak(workouts: any[]): number {
  if (workouts.length === 0) return 0;

  // Sort workouts by date (most recent first)
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Check today's workout
  const today = new Date().toDateString();
  if (
    sortedWorkouts.some((w) => new Date(w.startTime).toDateString() === today)
  ) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Check consecutive previous days
  for (let i = 0; i < sortedWorkouts.length; i++) {
    const workoutDate = new Date(sortedWorkouts[i].startTime);
    workoutDate.setHours(0, 0, 0, 0);

    if (workoutDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (workoutDate.getTime() < currentDate.getTime()) {
      break;
    }
  }

  return streak;
}

// Helper function to check if date is in this week
function isThisWeek(date: Date): boolean {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  return date >= startOfWeek && date <= endOfWeek;
}

// Helper function to calculate weekly volume trend
function calculateWeeklyVolume(workouts: any[]): any {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const thisWeekWorkouts = workouts.filter(
    (w: any) =>
      new Date(w.startTime) >= lastWeek && new Date(w.startTime) <= now
  );
  const lastWeekWorkouts = workouts.filter((w: any) => {
    const workoutDate = new Date(w.startTime);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return workoutDate >= twoWeeksAgo && workoutDate < lastWeek;
  });

  const thisWeekVolume = thisWeekWorkouts.reduce(
    (sum: number, workout: any) => {
      return (
        sum +
        workout.exerciseLogs.reduce((exerciseSum: number, exercise: any) => {
          return (
            exerciseSum +
            exercise.sets.reduce((setSum: number, set: any) => {
              return setSum + set.weight * set.reps;
            }, 0)
          );
        }, 0)
      );
    },
    0
  );

  const lastWeekVolume = lastWeekWorkouts.reduce(
    (sum: number, workout: any) => {
      return (
        sum +
        workout.exerciseLogs.reduce((exerciseSum: number, exercise: any) => {
          return (
            exerciseSum +
            exercise.sets.reduce((setSum: number, set: any) => {
              return setSum + set.weight * set.reps;
            }, 0)
          );
        }, 0)
      );
    },
    0
  );

  const percentageChange =
    lastWeekVolume > 0
      ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
      : 0;

  return {
    current: thisWeekVolume,
    previous: lastWeekVolume,
    trend:
      thisWeekVolume > lastWeekVolume
        ? "up"
        : thisWeekVolume < lastWeekVolume
        ? "down"
        : "same",
    percentageChange,
  };
}

export default router;
