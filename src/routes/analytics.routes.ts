// server/src/routes/analytics.routes.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

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
        exercises: {
          include: { sets: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Calculate analytics
    const analytics = {
      summary: calculateWorkoutSummary(workouts),
      weeklyProgression: calculateWeeklyProgression(workouts),
      muscleGroupDistribution: calculateMuscleGroupDistribution(workouts),
      topExercises: calculateTopExercises(workouts, 10),
      monthlyFrequency: calculateMonthlyFrequency(workouts),
      personalRecords: calculatePersonalRecords(workouts),
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
      weeklyVolumeTrend: calculateWeeklyVolumeTrend(workouts),
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
        exercises: {
          include: { sets: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const weeklyData = groupWorkoutsByWeek(workouts);

    res.json({
      success: true,
      data: weeklyData,
    });
  } catch (error) {
    console.error("Get volume error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch volume data",
    });
  }
});

// Helper functions
function calculateWorkoutSummary(workouts: any[]) {
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce(
    (sum, w) => sum + (w.calculatedMetrics?.totalVolume || 0),
    0
  );
  const totalExercises = workouts.reduce(
    (sum, w) => sum + w.exercises.length,
    0
  );
  const totalSets = workouts.reduce(
    (sum, w) =>
      sum +
      w.exercises.reduce((exSum: number, ex: any) => exSum + ex.sets.length, 0),
    0
  );

  return {
    totalWorkouts,
    totalVolume,
    averageVolumePerWorkout: totalVolume / totalWorkouts,
    totalExercises,
    totalSets,
    averageWorkoutDuration: calculateAverageDuration(workouts),
  };
}

function calculateAverageDuration(workouts: any[]): number {
  if (workouts.length === 0) return 0;

  const workoutsWithDuration = workouts.filter((w) => w.startTime && w.endTime);
  if (workoutsWithDuration.length === 0) return 45; // default

  const totalDuration = workoutsWithDuration.reduce((sum, w) => {
    const duration =
      (new Date(w.endTime!).getTime() - new Date(w.startTime).getTime()) /
      (1000 * 60); // minutes
    return sum + duration;
  }, 0);

  return Math.round(totalDuration / workoutsWithDuration.length);
}

function calculateWeeklyProgression(workouts: any[]): any[] {
  // Group workouts by week and calculate volume per week
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

    const weekVolume = weekWorkouts.reduce(
      (sum, w) => sum + (w.calculatedMetrics?.totalVolume || 0),
      0
    );

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

function calculateMuscleGroupDistribution(workouts: any[]): any {
  // Simplified muscle group distribution
  const muscleGroups: Record<string, number> = {};

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise: any) => {
      // In a real app, you'd map exerciseId to muscle groups
      const muscleGroup = exercise.exerciseName.toLowerCase().includes("bench")
        ? "chest"
        : exercise.exerciseName.toLowerCase().includes("squat")
        ? "legs"
        : exercise.exerciseName.toLowerCase().includes("pull")
        ? "back"
        : exercise.exerciseName.toLowerCase().includes("curl")
        ? "biceps"
        : exercise.exerciseName.toLowerCase().includes("press")
        ? "shoulders"
        : "other";

      muscleGroups[muscleGroup] = (muscleGroups[muscleGroup] || 0) + 1;
    });
  });

  return Object.entries(muscleGroups).map(([name, count]) => ({
    name,
    count,
    percentage:
      (count / Object.values(muscleGroups).reduce((a, b) => a + b, 0)) * 100,
  }));
}

function calculateTopExercises(workouts: any[], limit: number): any[] {
  const exerciseCounts: Record<
    string,
    { name: string; count: number; totalVolume: number }
  > = {};

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise: any) => {
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
        (sum: number, set: any) => sum + set.weight * set.reps,
        0
      );
      exerciseCounts[exercise.exerciseName].totalVolume += exerciseVolume;
    });
  });

  return Object.values(exerciseCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function calculateMonthlyFrequency(workouts: any[]): any[] {
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
          (w: any) => new Date(w.startTime).toISOString().split("T")[0]
        )
      ).size,
    });
  }

  return frequency;
}

function calculatePersonalRecords(workouts: any[]): any[] {
  const prs: any[] = [];
  const exerciseMaxes: Record<
    string,
    { weight: number; reps: number; date: Date }
  > = {};

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise: any) => {
      exercise.sets.forEach((set: any) => {
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

function calculateCurrentStreak(workouts: any[]): number {
  if (workouts.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if worked out today or yesterday
  const hasWorkedOutToday = workouts.some(
    (w) => new Date(w.startTime).toDateString() === today.toDateString()
  );
  const hasWorkedOutYesterday = workouts.some(
    (w) => new Date(w.startTime).toDateString() === yesterday.toDateString()
  );

  if (hasWorkedOutToday || hasWorkedOutYesterday) {
    streak = 1;
    let currentDate = hasWorkedOutToday ? today : yesterday;

    while (true) {
      currentDate.setDate(currentDate.getDate() - 1);
      const hasWorkedOut = workouts.some(
        (w) =>
          new Date(w.startTime).toDateString() === currentDate.toDateString()
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

function calculateLongestStreak(workouts: any[]): number {
  if (workouts.length === 0) return 0;

  const dates = workouts
    .map((w) => new Date(w.startTime).toDateString())
    .sort()
    .filter((date, i, arr) => arr.indexOf(date) === i);

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

function calculateWorkoutsThisWeek(workouts: any[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return workouts.filter((w) => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= startOfWeek && workoutDate <= now;
  }).length;
}

function calculateWeeklyVolumeTrend(workouts: any[]): any {
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

  const currentWeekVolume = currentWeekWorkouts.reduce(
    (sum, w) => sum + (w.calculatedMetrics?.totalVolume || 0),
    0
  );

  const lastWeekVolume = lastWeekWorkouts.reduce(
    (sum, w) => sum + (w.calculatedMetrics?.totalVolume || 0),
    0
  );

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

function groupWorkoutsByWeek(workouts: any[]) {
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
    groups[weekKey].volume += workout.calculatedMetrics?.totalVolume || 0;
    groups[weekKey].exercises += workout.exercises.length;

    return groups;
  }, {});

  // Convert to array and calculate intensity
  Object.values(grouped).forEach((week: any) => {
    week.intensity = week.volume / (week.workouts.length || 1);
    weeklyData.push(week);
  });

  return weeklyData.sort((a, b) => a.weekStart - b.weekStart);
}

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

export default router;
