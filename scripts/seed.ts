import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Setting up database...");

  // Create default user
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@paraverse.com" },
    update: {},
    create: {
      email: "demo@paraverse.com",
      password: hashedPassword,
      name: "Demo User",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      bio: "Welcome to ParaVerse Fitness!",
      preferences: {
        theme: "light",
        notifications: true,
        metricUnits: true,
      },
    },
  });

  console.log("✅ Demo user created:", user.email);

  // Create sample exercises
  const sampleExercises = [
    {
      name: "Bench Press",
      description: "Standard barbell bench press for chest development",
      primaryMuscleGroup: "chest",
      secondaryMuscleGroups: ["shoulders", "triceps"],
      equipment: ["barbell"],
      category: "strength",
      custom: false,
    },
    {
      name: "Squat",
      description: "Barbell back squat for leg development",
      primaryMuscleGroup: "legs",
      secondaryMuscleGroups: ["glutes"],
      equipment: ["barbell"],
      category: "strength",
      custom: false,
    },
    {
      name: "Pull-up",
      description: "Bodyweight pull-up for back development",
      primaryMuscleGroup: "back",
      secondaryMuscleGroups: ["biceps"],
      equipment: ["bodyweight"],
      category: "strength",
      custom: false,
    },
  ];

  for (const exercise of sampleExercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {},
      create: exercise,
    });
  }

  console.log("✅ Sample exercises created");

  console.log("🎉 Database setup complete!");
}

main()
  .catch((e) => {
    console.error("Error setting up database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
