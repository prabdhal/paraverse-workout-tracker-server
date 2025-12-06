import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 10);
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@paraverse.com' },
      update: {},
      create: {
        email: 'demo@paraverse.com',
        password: demoPassword,
        name: 'Demo User',
        preferences: {
          theme: 'light',
          notifications: true,
          metricUnits: true
        }
      },
    });
    
    console.log('✅ Created demo user: demo@paraverse.com / demo123');
    
    // Create some sample exercises
    const exercises = [
      {
        name: 'Barbell Bench Press',
        description: 'Classic chest exercise for building upper body strength',
        primaryMuscleGroup: 'chest',
        secondaryMuscleGroups: ['shoulders', 'triceps'],
        equipment: ['barbell'],
        category: 'strength',
        isGlobal: true,
      },
      {
        name: 'Pull-ups',
        description: 'Bodyweight exercise for back and biceps',
        primaryMuscleGroup: 'back',
        secondaryMuscleGroups: ['biceps'],
        equipment: ['bodyweight'],
        category: 'strength',
        isGlobal: true,
      },
      {
        name: 'Barbell Squats',
        description: 'Fundamental leg exercise for overall strength',
        primaryMuscleGroup: 'legs',
        secondaryMuscleGroups: ['glutes'],
        equipment: ['barbell'],
        category: 'strength',
        isGlobal: true,
      },
    ];
    
    for (const exercise of exercises) {
      await prisma.exercise.upsert({
        where: { name: exercise.name },
        update: {},
        create: exercise,
      });
      console.log(`✅ Created exercise: ${exercise.name}`);
    }
    
    console.log('✅ Seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
