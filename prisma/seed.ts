// server/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// System user ID - fixed so we can reference it
const SYSTEM_USER_ID = "system-user-12345";

// Create a system user for app-created content
async function createSystemUser() {
  console.log("Creating system user...");

  // Check if system user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "system@workoutapp.com" },
  });

  if (existingUser) {
    console.log("System user already exists");
    return existingUser;
  }

  const systemUser = await prisma.user.create({
    data: {
      id: SYSTEM_USER_ID,
      email: "system@workoutapp.com",
      password: "$2b$10$dummyhashforseedonly123456789012", // Dummy hash
      name: "Workout App",
      bio: "System user for app-created content",
      preferences: {},
    },
  });

  console.log("System user created");
  return systemUser;
}

async function seedExercises(systemUserId: string) {
  console.log("Seeding exercises...");

  const exercises = [
    // Compound Strength Exercises
    {
      name: "Barbell Squat",
      description:
        "Full body compound exercise targeting quads, glutes, hamstrings, and core",
      primaryMuscleGroup: "quads",
      secondaryMuscleGroups: ["glutes", "hamstrings", "lower_back", "core"],
      equipment: ["barbell", "racks"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
      imageUrl: "https://example.com/squat.jpg",
    },
    {
      name: "Barbell Bench Press",
      description:
        "Upper body compound exercise targeting chest, shoulders, and triceps",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["shoulders", "triceps"],
      equipment: ["barbell", "bench"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Deadlift",
      description:
        "Full body posterior chain exercise targeting back, glutes, and hamstrings",
      primaryMuscleGroup: "lower_back",
      secondaryMuscleGroups: ["glutes", "hamstrings", "traps"],
      equipment: ["barbell"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Overhead Press (Barbell)",
      description: "Shoulder-dominant compound exercise",
      primaryMuscleGroup: "shoulders",
      secondaryMuscleGroups: ["triceps", "core"],
      equipment: ["barbell"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Bent Over Barbell Row",
      description: "Back thickness and width builder",
      primaryMuscleGroup: "back",
      secondaryMuscleGroups: ["biceps", "rear_delts"],
      equipment: ["barbell"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Pull-ups",
      description: "Bodyweight back and bicep exercise",
      primaryMuscleGroup: "back",
      secondaryMuscleGroups: ["biceps", "forearms"],
      equipment: ["pull_up_bar"],
      category: "bodyweight",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Push-ups",
      description: "Bodyweight chest and tricep exercise",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["shoulders", "triceps", "core"],
      equipment: [],
      category: "bodyweight",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Barbell Bicep Curls",
      description: "Isolation exercise for biceps",
      primaryMuscleGroup: "biceps",
      secondaryMuscleGroups: ["forearms"],
      equipment: ["barbell"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Skull Crushers",
      description: "Tricep isolation exercise",
      primaryMuscleGroup: "triceps",
      secondaryMuscleGroups: [],
      equipment: ["barbell", "ez_bar", "dumbbells"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Leg Press",
      description: "Quad and glute focused machine exercise",
      primaryMuscleGroup: "quads",
      secondaryMuscleGroups: ["glutes", "hamstrings"],
      equipment: ["leg_press_machine"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Dumbbell Lateral Raises",
      description: "Shoulder width builder",
      primaryMuscleGroup: "shoulders",
      secondaryMuscleGroups: [],
      equipment: ["dumbbells"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Leg Curls",
      description: "Hamstring isolation exercise",
      primaryMuscleGroup: "hamstrings",
      secondaryMuscleGroups: [],
      equipment: ["leg_curl_machine"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Calf Raises",
      description: "Calf muscle builder",
      primaryMuscleGroup: "calves",
      secondaryMuscleGroups: [],
      equipment: ["calf_raise_machine", "dumbbells"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Plank",
      description: "Core stability exercise",
      primaryMuscleGroup: "core",
      secondaryMuscleGroups: ["shoulders"],
      equipment: [],
      category: "bodyweight",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Russian Twists",
      description: "Oblique and core exercise",
      primaryMuscleGroup: "core",
      secondaryMuscleGroups: ["obliques"],
      equipment: ["medicine_ball", "dumbbell"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Dumbbell Shoulder Press",
      description: "Shoulder press with dumbbells",
      primaryMuscleGroup: "shoulders",
      secondaryMuscleGroups: ["triceps"],
      equipment: ["dumbbells"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Incline Dumbbell Press",
      description: "Upper chest focused press",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["shoulders", "triceps"],
      equipment: ["dumbbells", "bench"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Lat Pulldowns",
      description: "Back width builder using cable machine",
      primaryMuscleGroup: "back",
      secondaryMuscleGroups: ["biceps"],
      equipment: ["cable_machine"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Face Pulls",
      description: "Rear delt and upper back exercise",
      primaryMuscleGroup: "rear_delts",
      secondaryMuscleGroups: ["traps", "rhomboids"],
      equipment: ["cable_machine"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
    {
      name: "Barbell Hip Thrust",
      description: "Glute focused exercise",
      primaryMuscleGroup: "glutes",
      secondaryMuscleGroups: ["hamstrings", "core"],
      equipment: ["barbell", "bench"],
      category: "strength",
      custom: false,
      createdBy: systemUserId,
    },
  ];

  // Create exercises
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: exercise,
      create: exercise,
    });
  }

  console.log(`${exercises.length} exercises seeded`);
}

async function seedWorkoutPrograms(systemUserId: string) {
  console.log("Seeding workout programs...");

  // First get exercise IDs for reference
  const exercises = await prisma.exercise.findMany();
  const exerciseMap = exercises.reduce((map, ex) => {
    map[ex.name] = ex.id;
    return map;
  }, {} as Record<string, string>);

  // Program 1: Full Body Beginner Program
  const fullBodyProgram = await prisma.workoutProgram.create({
    data: {
      name: "Full Body Beginner Program",
      description:
        "Perfect for beginners starting their fitness journey. Focuses on compound movements and full-body development.",
      difficulty: "beginner",
      goal: "general_fitness",
      daysPerWeek: 3,
      durationWeeks: 8,
      tags: ["beginner", "full-body", "strength", "foundation"],
      isPublic: true,
      createdBy: systemUserId,
      creatorName: "Workout App",
      workoutDays: {
        create: [
          {
            name: "Full Body Day A",
            description: "Compound focus day",
            dayNumber: 1,
            order: 1,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Barbell Squat"],
                  exerciseName: "Barbell Squat",
                  sets: 3,
                  repType: "fixed",
                  reps: 10,
                  restInterval: 90,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Barbell Bench Press"],
                  exerciseName: "Barbell Bench Press",
                  sets: 3,
                  repType: "fixed",
                  reps: 10,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Bent Over Barbell Row"],
                  exerciseName: "Bent Over Barbell Row",
                  sets: 3,
                  repType: "fixed",
                  reps: 10,
                  restInterval: 90,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Dumbbell Shoulder Press"],
                  exerciseName: "Dumbbell Shoulder Press",
                  sets: 3,
                  repType: "fixed",
                  reps: 12,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Plank"],
                  exerciseName: "Plank",
                  sets: 3,
                  repType: "fixed",
                  reps: 30, // seconds
                  restInterval: 60,
                  order: 5,
                },
              ],
            },
          },
          {
            name: "Full Body Day B",
            description: "Variation day",
            dayNumber: 2,
            order: 2,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Deadlift"],
                  exerciseName: "Deadlift",
                  sets: 3,
                  repType: "fixed",
                  reps: 8,
                  restInterval: 120,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Overhead Press (Barbell)"],
                  exerciseName: "Overhead Press (Barbell)",
                  sets: 3,
                  repType: "fixed",
                  reps: 10,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Lat Pulldowns"],
                  exerciseName: "Lat Pulldowns",
                  sets: 3,
                  repType: "fixed",
                  reps: 12,
                  restInterval: 60,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Leg Press"],
                  exerciseName: "Leg Press",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Russian Twists"],
                  exerciseName: "Russian Twists",
                  sets: 3,
                  repType: "fixed",
                  reps: 20,
                  restInterval: 45,
                  order: 5,
                },
              ],
            },
          },
          {
            name: "Full Body Day C",
            description: "Accessory and cardio day",
            dayNumber: 3,
            order: 3,
            estimatedDuration: 45,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Push-ups"],
                  exerciseName: "Push-ups",
                  sets: 3,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 60,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Pull-ups"],
                  exerciseName: "Pull-ups",
                  sets: 3,
                  repType: "range",
                  reps: 5,
                  maxReps: 10,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Barbell Hip Thrust"],
                  exerciseName: "Barbell Hip Thrust",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 60,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Dumbbell Lateral Raises"],
                  exerciseName: "Dumbbell Lateral Raises",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 45,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Calf Raises"],
                  exerciseName: "Calf Raises",
                  sets: 3,
                  repType: "fixed",
                  reps: 20,
                  restInterval: 45,
                  order: 5,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      workoutDays: {
        include: {
          programDayExercises: true,
        },
      },
    },
  });

  // Program 2: Push Pull Legs (PPL) - Intermediate
  const pplProgram = await prisma.workoutProgram.create({
    data: {
      name: "Push Pull Legs (PPL)",
      description:
        "Classic bodybuilding split for balanced muscle development and hypertrophy.",
      difficulty: "intermediate",
      goal: "muscle_building",
      daysPerWeek: 6,
      durationWeeks: 12,
      tags: ["intermediate", "hypertrophy", "bodybuilding", "ppl"],
      isPublic: true,
      createdBy: systemUserId,
      creatorName: "Workout App",
      workoutDays: {
        create: [
          // Push Day 1
          {
            name: "Push Day 1 (Chest Focus)",
            description: "Chest-dominant push day",
            dayNumber: 1,
            order: 1,
            estimatedDuration: 75,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Barbell Bench Press"],
                  exerciseName: "Barbell Bench Press",
                  sets: 4,
                  repType: "range",
                  reps: 6,
                  maxReps: 10,
                  restInterval: 120,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Incline Dumbbell Press"],
                  exerciseName: "Incline Dumbbell Press",
                  sets: 3,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Overhead Press (Barbell)"],
                  exerciseName: "Overhead Press (Barbell)",
                  sets: 3,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 90,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Skull Crushers"],
                  exerciseName: "Skull Crushers",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Dumbbell Lateral Raises"],
                  exerciseName: "Dumbbell Lateral Raises",
                  sets: 4,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 45,
                  order: 5,
                },
              ],
            },
          },
          // Pull Day 1
          {
            name: "Pull Day 1 (Back Focus)",
            description: "Back-dominant pull day",
            dayNumber: 2,
            order: 2,
            estimatedDuration: 75,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Deadlift"],
                  exerciseName: "Deadlift",
                  sets: 4,
                  repType: "range",
                  reps: 5,
                  maxReps: 8,
                  restInterval: 150,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Pull-ups"],
                  exerciseName: "Pull-ups",
                  sets: 4,
                  repType: "range",
                  reps: 6,
                  maxReps: 12,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Bent Over Barbell Row"],
                  exerciseName: "Bent Over Barbell Row",
                  sets: 3,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 90,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Face Pulls"],
                  exerciseName: "Face Pulls",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Barbell Bicep Curls"],
                  exerciseName: "Barbell Bicep Curls",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 60,
                  order: 5,
                },
              ],
            },
          },
          // Legs Day 1
          {
            name: "Legs Day 1",
            description: "Quad-dominant leg day",
            dayNumber: 3,
            order: 3,
            estimatedDuration: 75,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Barbell Squat"],
                  exerciseName: "Barbell Squat",
                  sets: 4,
                  repType: "range",
                  reps: 6,
                  maxReps: 10,
                  restInterval: 120,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Leg Press"],
                  exerciseName: "Leg Press",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Leg Curls"],
                  exerciseName: "Leg Curls",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 60,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Barbell Hip Thrust"],
                  exerciseName: "Barbell Hip Thrust",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Calf Raises"],
                  exerciseName: "Calf Raises",
                  sets: 4,
                  repType: "fixed",
                  reps: 20,
                  restInterval: 45,
                  order: 5,
                },
              ],
            },
          },
          // Push Day 2 (Shoulder Focus)
          {
            name: "Push Day 2 (Shoulder Focus)",
            description: "Shoulder-dominant push day",
            dayNumber: 4,
            order: 4,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Overhead Press (Barbell)"],
                  exerciseName: "Overhead Press (Barbell)",
                  sets: 4,
                  repType: "range",
                  reps: 6,
                  maxReps: 10,
                  restInterval: 120,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Incline Dumbbell Press"],
                  exerciseName: "Incline Dumbbell Press",
                  sets: 3,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Dumbbell Lateral Raises"],
                  exerciseName: "Dumbbell Lateral Raises",
                  sets: 4,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 45,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Skull Crushers"],
                  exerciseName: "Skull Crushers",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Push-ups"],
                  exerciseName: "Push-ups",
                  sets: 3,
                  repType: "range",
                  reps: 15,
                  maxReps: 20,
                  restInterval: 45,
                  order: 5,
                },
              ],
            },
          },
          // Pull Day 2 (Width Focus)
          {
            name: "Pull Day 2 (Width Focus)",
            description: "Lat width focused pull day",
            dayNumber: 5,
            order: 5,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Lat Pulldowns"],
                  exerciseName: "Lat Pulldowns",
                  sets: 4,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 90,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Bent Over Barbell Row"],
                  exerciseName: "Bent Over Barbell Row",
                  sets: 3,
                  repType: "range",
                  reps: 8,
                  maxReps: 12,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Face Pulls"],
                  exerciseName: "Face Pulls",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 60,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Barbell Bicep Curls"],
                  exerciseName: "Barbell Bicep Curls",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Pull-ups"],
                  exerciseName: "Pull-ups",
                  sets: 3,
                  repType: "range",
                  reps: 6,
                  maxReps: 10,
                  restInterval: 90,
                  order: 5,
                },
              ],
            },
          },
          // Legs Day 2 (Posterior Focus)
          {
            name: "Legs Day 2 (Posterior Focus)",
            description: "Hamstring and glute focused leg day",
            dayNumber: 6,
            order: 6,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Deadlift"],
                  exerciseName: "Deadlift",
                  sets: 3,
                  repType: "range",
                  reps: 5,
                  maxReps: 8,
                  restInterval: 150,
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Barbell Hip Thrust"],
                  exerciseName: "Barbell Hip Thrust",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 90,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Leg Curls"],
                  exerciseName: "Leg Curls",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 15,
                  restInterval: 60,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Leg Press"],
                  exerciseName: "Leg Press",
                  sets: 3,
                  repType: "range",
                  reps: 12,
                  maxReps: 20,
                  restInterval: 60,
                  order: 4,
                },
                {
                  exerciseId: exerciseMap["Calf Raises"],
                  exerciseName: "Calf Raises",
                  sets: 4,
                  repType: "fixed",
                  reps: 20,
                  restInterval: 45,
                  order: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Program 3: 5x5 Strength Program
  const strengthProgram = await prisma.workoutProgram.create({
    data: {
      name: "5x5 Strength Program",
      description:
        "Simple, effective strength training focusing on progressive overload with 5 sets of 5 reps.",
      difficulty: "intermediate",
      goal: "strength_training",
      daysPerWeek: 3,
      durationWeeks: 12,
      tags: ["strength", "powerlifting", "5x5", "compound"],
      isPublic: true,
      createdBy: systemUserId,
      creatorName: "Workout App",
      workoutDays: {
        create: [
          {
            name: "Workout A",
            description: "Squat and Press focus",
            dayNumber: 1,
            order: 1,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Barbell Squat"],
                  exerciseName: "Barbell Squat",
                  sets: 5,
                  repType: "fixed",
                  reps: 5,
                  restInterval: 180,
                  notes: "Focus on progressive overload",
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Barbell Bench Press"],
                  exerciseName: "Barbell Bench Press",
                  sets: 5,
                  repType: "fixed",
                  reps: 5,
                  restInterval: 180,
                  notes: "Increase weight each week",
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Bent Over Barbell Row"],
                  exerciseName: "Bent Over Barbell Row",
                  sets: 5,
                  repType: "fixed",
                  reps: 5,
                  restInterval: 180,
                  notes: "Keep back straight",
                  order: 3,
                },
              ],
            },
          },
          {
            name: "Workout B",
            description: "Deadlift and Press focus",
            dayNumber: 2,
            order: 2,
            estimatedDuration: 60,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Barbell Squat"],
                  exerciseName: "Barbell Squat",
                  sets: 5,
                  repType: "fixed",
                  reps: 5,
                  restInterval: 180,
                  notes: "Focus on progressive overload",
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Overhead Press (Barbell)"],
                  exerciseName: "Overhead Press (Barbell)",
                  sets: 5,
                  repType: "fixed",
                  reps: 5,
                  restInterval: 180,
                  notes: "Increase weight each week",
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Deadlift"],
                  exerciseName: "Deadlift",
                  sets: 1,
                  repType: "fixed",
                  reps: 5,
                  restInterval: 240,
                  notes: "One heavy set only",
                  order: 3,
                },
              ],
            },
          },
          {
            name: "Accessory Day",
            description: "Weak point and accessory work",
            dayNumber: 3,
            order: 3,
            estimatedDuration: 45,
            programDayExercises: {
              create: [
                {
                  exerciseId: exerciseMap["Pull-ups"],
                  exerciseName: "Pull-ups",
                  sets: 3,
                  repType: "range",
                  reps: 5,
                  maxReps: 10,
                  restInterval: 90,
                  notes: "Assisted if needed",
                  order: 1,
                },
                {
                  exerciseId: exerciseMap["Push-ups"],
                  exerciseName: "Push-ups",
                  sets: 3,
                  repType: "range",
                  reps: 10,
                  maxReps: 20,
                  restInterval: 60,
                  order: 2,
                },
                {
                  exerciseId: exerciseMap["Plank"],
                  exerciseName: "Plank",
                  sets: 3,
                  repType: "fixed",
                  reps: 60, // seconds
                  restInterval: 60,
                  order: 3,
                },
                {
                  exerciseId: exerciseMap["Face Pulls"],
                  exerciseName: "Face Pulls",
                  sets: 3,
                  repType: "fixed",
                  reps: 15,
                  restInterval: 60,
                  notes: "For shoulder health",
                  order: 4,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("3 workout programs seeded:");
  console.log("1. Full Body Beginner Program (3 days/week)");
  console.log("2. Push Pull Legs (PPL) (6 days/week)");
  console.log("3. 5x5 Strength Program (3 days/week)");
}

async function main() {
  console.log("Starting database seed...");

  try {
    // Create system user
    const systemUser = await createSystemUser();

    // Seed exercises
    await seedExercises(systemUser.id);

    // Seed workout programs
    await seedWorkoutPrograms(systemUser.id);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
