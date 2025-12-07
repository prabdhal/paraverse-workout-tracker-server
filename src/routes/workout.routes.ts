// server/src/routes/workout.routes.ts - CORRECTED
import express from "express";
import { PrismaClient, WorkoutLog, ExerciseLog, SetLog } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Helper interface for request body
interface CreateWorkoutBody {
  workoutType: string;
  workoutName: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    order: number;
    notes?: string;
    programExerciseId?: string;
    sets: Array<{
      setNumber: number;
      reps: number;
      weight: number;
      completed?: boolean;
      rpe?: number;
      notes?: string;
    }>;
  }>;
  programId?: string;
  programName?: string;
  dayId?: string;
  dayName?: string;
  tags?: string[];
  calculatedMetrics?: any;
}

// Get all workouts for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const workouts = await prisma.workoutLog.findMany({
      where: { userId: req.user!.userId },
      include: {
        exerciseLogs: {
          include: { sets: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    // Transform to match your frontend WorkoutLog type
    const transformedWorkouts = workouts.map(
      (
        workout: WorkoutLog & {
          exerciseLogs: (ExerciseLog & { sets: SetLog[] })[];
        }
      ) => ({
        id: workout.id,
        userId: workout.userId,
        workoutType: workout.workoutType as "program" | "custom", // Changed from 'type' to 'workoutType'
        workoutName: workout.workoutName, // Changed from 'name' to 'workoutName'
        startTime: workout.startTime,
        endTime: workout.endTime,
        exercises: workout.exerciseLogs.map(
          // Changed 'exerciseLogs' to 'exercises' for frontend
          (exercise: ExerciseLog & { sets: SetLog[] }) => ({
            id: exercise.id,
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName, // Fixed: use exerciseName, not name
            sets: exercise.sets.map((set: SetLog) => ({
              id: set.id,
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              completed: set.completed,
              rpe: set.rpe,
              notes: set.notes,
            })),
            notes: exercise.notes,
            order: exercise.order,
            programExerciseId: exercise.programExerciseId,
          })
        ),
        completed: workout.completed,
        tags: workout.tags,
        calculatedMetrics: workout.calculatedMetrics
          ? typeof workout.calculatedMetrics === "string"
            ? JSON.parse(workout.calculatedMetrics)
            : workout.calculatedMetrics
          : {},
        programId: workout.programId,
        programName: workout.programName,
        dayId: workout.dayId,
        dayName: workout.dayName,
      })
    );

    res.json({
      success: true,
      data: transformedWorkouts,
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
        exerciseLogs: {
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

    // Transform to match frontend
    const transformedWorkout = {
      id: workout.id,
      userId: workout.userId,
      workoutType: workout.workoutType as "program" | "custom",
      workoutName: workout.workoutName,
      startTime: workout.startTime,
      endTime: workout.endTime,
      exercises: workout.exerciseLogs.map(
        (exercise: ExerciseLog & { sets: SetLog[] }) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set: SetLog) => ({
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
            rpe: set.rpe,
            notes: set.notes,
          })),
          notes: exercise.notes,
          order: exercise.order,
          programExerciseId: exercise.programExerciseId,
        })
      ),
      completed: workout.completed,
      tags: workout.tags,
      calculatedMetrics: workout.calculatedMetrics
        ? typeof workout.calculatedMetrics === "string"
          ? JSON.parse(workout.calculatedMetrics)
          : workout.calculatedMetrics
        : {},
      programId: workout.programId,
      programName: workout.programName,
      dayId: workout.dayId,
      dayName: workout.dayName,
    };

    res.json({
      success: true,
      data: transformedWorkout,
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
      programName,
      dayName,
    } = req.body as CreateWorkoutBody;

    const workout = await prisma.workoutLog.create({
      data: {
        userId: req.user!.userId,
        workoutType: workoutType, // Fixed: use 'workoutType', not 'type'
        workoutName: workoutName, // Fixed: use 'workoutName', not 'name'
        startTime: new Date(),
        completed: false,
        tags: tags || [],
        calculatedMetrics: calculatedMetrics || {},
        programId,
        programName,
        dayId,
        dayName,
        exerciseLogs: {
          // Fixed: use 'exerciseLogs', not 'exercises'
          create: exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName, // Fixed: use 'exerciseName', not 'name'
            order: exercise.order,
            notes: exercise.notes,
            programExerciseId: exercise.programExerciseId,
            sets: {
              create: exercise.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps,
                weight: set.weight,
                completed: set.completed || true,
                rpe: set.rpe,
                notes: set.notes,
              })),
            },
          })),
        },
      },
      include: {
        exerciseLogs: {
          include: { sets: true },
        },
      },
    });

    // Transform response
    const transformedWorkout = {
      id: workout.id,
      userId: workout.userId,
      workoutType: workout.workoutType as "program" | "custom",
      workoutName: workout.workoutName,
      startTime: workout.startTime,
      endTime: workout.endTime,
      exercises: workout.exerciseLogs.map(
        (exercise: ExerciseLog & { sets: SetLog[] }) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set: SetLog) => ({
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
            rpe: set.rpe,
            notes: set.notes,
          })),
          notes: exercise.notes,
          order: exercise.order,
          programExerciseId: exercise.programExerciseId,
        })
      ),
      completed: workout.completed,
      tags: workout.tags,
      calculatedMetrics: workout.calculatedMetrics
        ? typeof workout.calculatedMetrics === "string"
          ? JSON.parse(workout.calculatedMetrics)
          : workout.calculatedMetrics
        : {},
      programId: workout.programId,
      programName: workout.programName,
      dayId: workout.dayId,
      dayName: workout.dayName,
    };

    res.status(201).json({
      success: true,
      message: "Workout created successfully",
      data: transformedWorkout,
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
    const { workoutName, endTime, completed, tags, calculatedMetrics } =
      req.body;

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
        workoutName: workoutName, // Fixed: use 'workoutName', not 'name'
        endTime: endTime ? new Date(endTime) : undefined,
        completed,
        tags,
        calculatedMetrics:
          calculatedMetrics || existingWorkout.calculatedMetrics, // Fixed: use 'calculatedMetrics', not 'metrics'
      },
      include: {
        exerciseLogs: {
          include: { sets: true },
        },
      },
    });

    // Transform response
    const transformedWorkout = {
      id: workout.id,
      userId: workout.userId,
      workoutType: workout.workoutType as "program" | "custom",
      workoutName: workout.workoutName,
      startTime: workout.startTime,
      endTime: workout.endTime,
      exercises: workout.exerciseLogs.map(
        (exercise: ExerciseLog & { sets: SetLog[] }) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set: SetLog) => ({
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
            rpe: set.rpe,
            notes: set.notes,
          })),
          notes: exercise.notes,
          order: exercise.order,
          programExerciseId: exercise.programExerciseId,
        })
      ),
      completed: workout.completed,
      tags: workout.tags,
      calculatedMetrics: workout.calculatedMetrics
        ? typeof workout.calculatedMetrics === "string"
          ? JSON.parse(workout.calculatedMetrics)
          : workout.calculatedMetrics
        : {},
      programId: workout.programId,
      programName: workout.programName,
      dayId: workout.dayId,
      dayName: workout.dayName,
    };

    res.json({
      success: true,
      message: "Workout updated successfully",
      data: transformedWorkout,
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
        calculatedMetrics: calculatedMetrics || {}, // Fixed: use 'calculatedMetrics', not 'metrics'
      },
      include: {
        exerciseLogs: {
          include: { sets: true },
        },
      },
    });

    // Transform response
    const transformedWorkout = {
      id: workout.id,
      userId: workout.userId,
      workoutType: workout.workoutType as "program" | "custom",
      workoutName: workout.workoutName,
      startTime: workout.startTime,
      endTime: workout.endTime,
      exercises: workout.exerciseLogs.map(
        (exercise: ExerciseLog & { sets: SetLog[] }) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set: SetLog) => ({
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
            rpe: set.rpe,
            notes: set.notes,
          })),
          notes: exercise.notes,
          order: exercise.order,
          programExerciseId: exercise.programExerciseId,
        })
      ),
      completed: workout.completed,
      tags: workout.tags,
      calculatedMetrics: workout.calculatedMetrics
        ? typeof workout.calculatedMetrics === "string"
          ? JSON.parse(workout.calculatedMetrics)
          : workout.calculatedMetrics
        : {},
      programId: workout.programId,
      programName: workout.programName,
      dayId: workout.dayId,
      dayName: workout.dayName,
    };

    res.json({
      success: true,
      message: "Workout completed successfully",
      data: transformedWorkout,
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
        exerciseLogs: {
          include: { sets: true },
        },
      },
    });

    // Calculate stats
    let totalVolume = 0;
    const exerciseCount: Record<string, number> = {};

    workouts.forEach(
      (
        workout: WorkoutLog & {
          exerciseLogs: (ExerciseLog & { sets: SetLog[] })[];
        }
      ) => {
        // Parse calculatedMetrics if they exist
        if (workout.calculatedMetrics) {
          try {
            const metrics =
              typeof workout.calculatedMetrics === "string"
                ? JSON.parse(workout.calculatedMetrics)
                : workout.calculatedMetrics;
            if (metrics.totalVolume) {
              totalVolume += metrics.totalVolume;
            }
          } catch (e) {
            // If parsing fails, calculate from sets
            workout.exerciseLogs.forEach(
              (exercise: ExerciseLog & { sets: SetLog[] }) => {
                exercise.sets.forEach((set: SetLog) => {
                  if (set.completed) {
                    totalVolume += set.reps * set.weight;
                  }
                });
              }
            );
          }
        } else {
          // Calculate from sets if no metrics
          workout.exerciseLogs.forEach(
            (exercise: ExerciseLog & { sets: SetLog[] }) => {
              exercise.sets.forEach((set: SetLog) => {
                if (set.completed) {
                  totalVolume += set.reps * set.weight;
                }
              });
            }
          );
        }

        // Count exercises
        workout.exerciseLogs.forEach(
          (exercise: ExerciseLog & { sets: SetLog[] }) => {
            exerciseCount[exercise.exerciseName] =
              (exerciseCount[exercise.exerciseName] || 0) + 1;
          }
        );
      }
    );

    // Find favorite exercise
    let favoriteExercise = "None";
    let maxCount = 0;
    for (const [exercise, count] of Object.entries(exerciseCount)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteExercise = exercise;
      }
    }

    const stats = {
      totalWorkouts: workouts.length,
      totalVolume,
      averageWorkoutsPerWeek: calculateAverageWorkoutsPerWeek(workouts),
      currentStreak: calculateStreak(workouts),
      favoriteExercise,
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

// Helper functions - FIXED types
function calculateAverageWorkoutsPerWeek(
  workouts: (WorkoutLog & {
    exerciseLogs: (ExerciseLog & { sets: SetLog[] })[];
  })[]
): number {
  if (workouts.length === 0) return 0;

  const firstWorkout = new Date(workouts[workouts.length - 1].startTime);
  const lastWorkout = new Date(workouts[0].startTime);
  const weeks = Math.max(
    1,
    (lastWorkout.getTime() - firstWorkout.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );

  return Math.round((workouts.length / weeks) * 10) / 10;
}

function calculateStreak(
  workouts: (WorkoutLog & {
    exerciseLogs: (ExerciseLog & { sets: SetLog[] })[];
  })[]
): number {
  if (workouts.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const workoutDates = workouts.map((w) => {
    const date = new Date(w.startTime);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  });

  const uniqueDates = [...new Set(workoutDates)].sort((a, b) => b - a);

  let expectedDate = today.getTime();
  for (const date of uniqueDates) {
    if (date === expectedDate) {
      streak++;
      expectedDate -= 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }

  return streak;
}

export default router;
