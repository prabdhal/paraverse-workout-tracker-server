// server/src/routes/analytics.routes.ts - CORRECTED
import express from "express";
import { PrismaClient, WorkoutLog, ExerciseLog, SetLog } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Helper interfaces for type safety
interface WorkoutWithLogs extends WorkoutLog {
  exerciseLogs: (ExerciseLog & { sets: SetLog[] })[];
}

// Get workout analytics
router.get("/workouts", authenticateToken, async (req, res) => {
  try {
    const { period = "month" } = req.query;

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
      orderBy: { startTime: "asc" },
    });

    // Calculate analytics
    const analytics = {
      summary: calculateWorkoutSummary(workouts as WorkoutWithLogs[]),
      weeklyProgression: calculateWeeklyProgression(
        workouts as WorkoutWithLogs[]
      ),
      muscleGroupDistribution: calculateMuscleGroupDistribution(
        workouts as WorkoutWithLogs[]
      ),
      topExercises: calculateTopExercises(workouts as WorkoutWithLogs[], 10),
      monthlyFrequency: calculateMonthlyFrequency(
        workouts as WorkoutWithLogs[]
      ),
      personalRecords: calculatePersonalRecords(workouts as WorkoutWithLogs[]),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get streak information
router.get("/streak", authenticateToken, async (req, res) => {
  try {
    const workouts = await prisma.workoutLog.findMany({
      where: {
        userId: req.user!.userId,
        completed: true,
      },
      orderBy: { startTime: "desc" },
    });

    const streakInfo = {
      currentStreak: calculateCurrentStreak(workouts),
      longestStreak: calculateLongestStreak(workouts),
      workoutsThisWeek: calculateWorkoutsThisWeek(workouts),
      weeklyVolumeTrend: calculateWeeklyVolumeTrend(
        workouts as WorkoutWithLogs[]
      ),
    };

    res.json({
      success: true,
      data: streakInfo,
    });
  } catch (error) {
    console.error("Get streak error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch streak information",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get volume progression
router.get("/volume", authenticateToken, async (req, res) => {
  try {
    const { weeks = 12 } = req.query;

    const workouts = await prisma.workoutLog.findMany({
      where: {
        userId: req.user!.userId,
        completed: true,
        startTime: {
          gte: new Date(
            Date.now() - parseInt(weeks as string) * 7 * 24 * 60 * 60 * 1000
          ),
        },
      },
      include: {
        exerciseLogs: {
          include: { sets: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const weeklyData = groupWorkoutsByWeek(workouts as WorkoutWithLogs[]);

    res.json({
      success: true,
      data: weeklyData,
    });
  } catch (error) {
    console.error("Get volume error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch volume data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Helper functions - UPDATED for WorkoutLog model
function calculateWorkoutSummary(workouts: WorkoutWithLogs[]) {
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((sum, w) => {
    const metrics = w.calculatedMetrics
      ? typeof w.calculatedMetrics === "string"
        ? JSON.parse(w.calculatedMetrics)
        : w.calculatedMetrics
      : {};
    return sum + (metrics.totalVolume || 0);
  }, 0);

  const totalExercises = workouts.reduce(
    (sum, w) => sum + w.exerciseLogs.length,
    0
  );

  const totalSets = workouts.reduce(
    (sum, w) =>
      sum + w.exerciseLogs.reduce((exSum, ex) => exSum + ex.sets.length, 0),
    0
  );

  return {
    totalWorkouts,
    totalVolume,
    averageVolumePerWorkout:
      totalWorkouts > 0 ? totalVolume / totalWorkouts : 0,
    totalExercises,
    totalSets,
    averageWorkoutDuration: calculateAverageDuration(workouts),
  };
}

function calculateAverageDuration(workouts: WorkoutWithLogs[]): number {
  if (workouts.length === 0) return 45; // default

  const workoutsWithDuration = workouts.filter((w) => w.startTime && w.endTime);
  if (workoutsWithDuration.length === 0) return 45;

  const totalDuration = workoutsWithDuration.reduce((sum, w) => {
    const duration =
      (new Date(w.endTime!).getTime() - new Date(w.startTime).getTime()) /
      (1000 * 60); // minutes
    return sum + duration;
  }, 0);

  return Math.round(totalDuration / workoutsWithDuration.length);
}

function calculateWeeklyProgression(workouts: WorkoutWithLogs[]): any[] {
  const weeklyData: any[] = [];
  const now = new Date();

  // Get last 8 weeks
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.startTime);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    const weekVolume = weekWorkouts.reduce((sum, w) => {
      const metrics = w.calculatedMetrics
        ? typeof w.calculatedMetrics === "string"
          ? JSON.parse(w.calculatedMetrics)
          : w.calculatedMetrics
        : {};
      return sum + (metrics.totalVolume || 0);
    }, 0);

    weeklyData.push({
      week: `Week ${8 - i}`,
      date: weekStart.toISOString().split("T")[0],
      volume: weekVolume,
      workouts: weekWorkouts.length,
      intensity: weekVolume / (weekWorkouts.length || 1),
    });
  }

  return weeklyData;
}

function calculateMuscleGroupDistribution(workouts: WorkoutWithLogs[]): any {
  // Simplified muscle group distribution
  const muscleGroups: Record<string, number> = {};

  workouts.forEach((workout) => {
    workout.exerciseLogs.forEach((exercise) => {
      // This should be improved with actual exercise data
      const muscleGroup = "other"; // Default
      muscleGroups[muscleGroup] = (muscleGroups[muscleGroup] || 0) + 1;
    });
  });

  const total = Object.values(muscleGroups).reduce((a, b) => a + b, 0);

  return Object.entries(muscleGroups).map(([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

function calculateTopExercises(
  workouts: WorkoutWithLogs[],
  limit: number
): any[] {
  const exerciseCounts: Record<
    string,
    { name: string; count: number; totalVolume: number }
  > = {};

  workouts.forEach((workout) => {
    workout.exerciseLogs.forEach((exercise) => {
      if (!exerciseCounts[exercise.exerciseName]) {
        exerciseCounts[exercise.exerciseName] = {
          name: exercise.exerciseName,
          count: 0,
          totalVolume: 0,
        };
      }

      exerciseCounts[exercise.exerciseName].count++;

      // Calculate volume for this exercise in this workout
      const exerciseVolume = exercise.sets.reduce(
        (sum, set) => sum + set.weight * set.reps,
        0
      );
      exerciseCounts[exercise.exerciseName].totalVolume += exerciseVolume;
    });
  });

  return Object.values(exerciseCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function calculateMonthlyFrequency(workouts: WorkoutWithLogs[]): any[] {
  const frequency: any[] = [];
  const now = new Date();

  // Get last 2 months
  for (let i = 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.startTime);
      return workoutDate >= monthStart && workoutDate <= monthEnd;
    });

    frequency.push({
      month: monthStart.toLocaleString("default", { month: "short" }),
      workouts: monthWorkouts.length,
      days: new Set(
        monthWorkouts.map(
          (w) => new Date(w.startTime).toISOString().split("T")[0]
        )
      ).size,
    });
  }

  return frequency;
}

function calculatePersonalRecords(workouts: WorkoutWithLogs[]): any[] {
  const prs: any[] = [];
  const exerciseMaxes: Record<
    string,
    { weight: number; reps: number; date: Date }
  > = {};

  workouts.forEach((workout) => {
    workout.exerciseLogs.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        const key = exercise.exerciseName;
        if (!exerciseMaxes[key] || set.weight > exerciseMaxes[key].weight) {
          exerciseMaxes[key] = {
            weight: set.weight,
            reps: set.reps,
            date: new Date(workout.startTime),
          };
        }
      });
    });
  });

  Object.entries(exerciseMaxes).forEach(([name, record]) => {
    prs.push({
      exercise: name,
      weight: record.weight,
      reps: record.reps,
      date: record.date,
    });
  });

  return prs.sort((a, b) => b.weight - a.weight).slice(0, 5);
}

function calculateCurrentStreak(workouts: WorkoutLog[]): number {
  if (workouts.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const workoutDates = workouts
    .map((w) => {
      const date = new Date(w.startTime);
      date.setHours(0, 0, 0, 0);
      return date;
    })
    .filter(
      (date, index, self) =>
        self.findIndex((d) => d.getTime() === date.getTime()) === index
    )
    .sort((a, b) => b.getTime() - a.getTime());

  // Check if worked out today or yesterday
  const todayStr = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const hasWorkedOutToday = workoutDates.some(
    (d) => d.toDateString() === todayStr
  );
  const hasWorkedOutYesterday = workoutDates.some(
    (d) => d.toDateString() === yesterdayStr
  );

  if (hasWorkedOutToday || hasWorkedOutYesterday) {
    streak = 1;
    let currentDate = hasWorkedOutToday ? today : yesterday;

    // Check consecutive days backwards
    while (true) {
      currentDate.setDate(currentDate.getDate() - 1);
      const dateStr = currentDate.toDateString();
      const hasWorkedOut = workoutDates.some(
        (d) => d.toDateString() === dateStr
      );

      if (hasWorkedOut) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
}

function calculateLongestStreak(workouts: WorkoutLog[]): number {
  if (workouts.length === 0) return 0;

  const dates = workouts
    .map((w) => {
      const date = new Date(w.startTime);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .filter((date, i, arr) => arr.indexOf(date) === i)
    .sort((a, b) => a - b);

  let longestStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }

  return Math.max(longestStreak, currentStreak);
}

function calculateWorkoutsThisWeek(workouts: WorkoutLog[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return workouts.filter((w) => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= startOfWeek && workoutDate <= now;
  }).length;
}

function calculateWeeklyVolumeTrend(workouts: WorkoutWithLogs[]): any {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(startOfWeek);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const currentWeekWorkouts = workouts.filter((w) => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= startOfWeek && workoutDate <= now;
  });

  const lastWeekWorkouts = workouts.filter((w) => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= lastWeekStart && workoutDate <= lastWeekEnd;
  });

  const calculateVolume = (workouts: WorkoutWithLogs[]) => {
    return workouts.reduce((sum, w) => {
      const metrics = w.calculatedMetrics
        ? typeof w.calculatedMetrics === "string"
          ? JSON.parse(w.calculatedMetrics)
          : w.calculatedMetrics
        : {};
      return sum + (metrics.totalVolume || 0);
    }, 0);
  };

  const currentWeekVolume = calculateVolume(currentWeekWorkouts);
  const lastWeekVolume = calculateVolume(lastWeekWorkouts);

  const percentageChange =
    lastWeekVolume === 0
      ? 100
      : ((currentWeekVolume - lastWeekVolume) / lastWeekVolume) * 100;

  return {
    current: currentWeekVolume,
    last: lastWeekVolume,
    trend:
      currentWeekVolume > lastWeekVolume
        ? "up"
        : currentWeekVolume < lastWeekVolume
        ? "down"
        : "same",
    percentageChange: Math.round(percentageChange),
  };
}

function groupWorkoutsByWeek(workouts: WorkoutWithLogs[]) {
  const weeklyData: any[] = [];

  // Group workouts by week
  const grouped = workouts.reduce((groups: any, workout) => {
    const weekStart = getWeekStartDate(new Date(workout.startTime));
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!groups[weekKey]) {
      groups[weekKey] = {
        weekStart,
        workouts: [],
        volume: 0,
        exercises: 0,
        intensity: 0,
      };
    }

    groups[weekKey].workouts.push(workout);

    const metrics = workout.calculatedMetrics
      ? typeof workout.calculatedMetrics === "string"
        ? JSON.parse(workout.calculatedMetrics)
        : workout.calculatedMetrics
      : {};
    groups[weekKey].volume += metrics.totalVolume || 0;
    groups[weekKey].exercises += workout.exerciseLogs.length;

    return groups;
  }, {});

  // Convert to array and calculate intensity
  Object.values(grouped).forEach((week: any) => {
    week.intensity = week.volume / (week.workouts.length || 1);
    weeklyData.push(week);
  });

  return weeklyData.sort((a: any, b: any) => a.weekStart - b.weekStart);
}

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

export default router;
