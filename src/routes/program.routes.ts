// server/src/routes/program.routes.ts
import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get all programs
router.get("/", authenticateToken, async (req, res) => {
  try {
    const programs = await prisma.workoutProgram.findMany({
      where: {
        OR: [{ createdBy: req.user!.userId }, { isPublic: true }],
      },
      include: {
        workoutDays: {
          include: { programDayExercises: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match frontend WorkoutDay type
    const transformedPrograms = programs.map((program) => ({
      ...program,
      isCreator: program.createdBy === req.user!.userId,
      workoutDays: program.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        description: day.description,
        dayNumber: day.dayNumber,
        order: day.order,
        estimatedDuration: day.estimatedDuration,
        exercises: day.programDayExercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets,
          repType: ex.repType,
          reps: ex.reps,
          maxReps: ex.maxReps,
          restInterval: ex.restInterval,
          notes: ex.notes,
          order: ex.order,
        })),
      })),
    }));

    res.json({
      success: true,
      data: transformedPrograms,
    });
  } catch (error) {
    console.error("Get programs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch programs",
    });
  }
});

// Get single program
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const program = await prisma.workoutProgram.findUnique({
      where: { id: req.params.id },
      include: {
        workoutDays: {
          include: { programDayExercises: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Check if user can view program
    if (!program.isPublic && program.createdBy !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this program",
      });
    }

    // Transform to match frontend
    const transformedProgram = {
      ...program,
      isCreator: program.createdBy === req.user!.userId,
      workoutDays: program.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        description: day.description,
        dayNumber: day.dayNumber,
        order: day.order,
        estimatedDuration: day.estimatedDuration,
        exercises: day.programDayExercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets,
          repType: ex.repType,
          reps: ex.reps,
          maxReps: ex.maxReps,
          restInterval: ex.restInterval,
          notes: ex.notes,
          order: ex.order,
        })),
      })),
    };

    res.json({
      success: true,
      data: transformedProgram,
    });
  } catch (error) {
    console.error("Get program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch program",
    });
  }
});

// Create program
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      difficulty,
      goal,
      daysPerWeek,
      durationWeeks,
      workoutDays,
      tags,
      isPublic,
      resourceLinks,
    } = req.body;

    // Get user from database to ensure we have the name
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const program = await prisma.workoutProgram.create({
      data: {
        name,
        description,
        difficulty,
        goal,
        daysPerWeek,
        durationWeeks,
        createdBy: req.user!.userId,
        creatorName: user.name,
        isPublic: isPublic || false,
        tags,
        resourceLinks,
        workoutDays: {
          create: workoutDays.map((day: any) => ({
            name: day.name,
            description: day.description,
            dayNumber: day.dayNumber,
            order: day.order,
            estimatedDuration: day.estimatedDuration,
            programDayExercises: {
              create: day.exercises.map((exercise: any) => ({
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                sets: exercise.sets,
                repType: exercise.repType,
                reps: exercise.reps,
                maxReps: exercise.maxReps,
                restInterval: exercise.restInterval,
                notes: exercise.notes,
                order: exercise.order,
              })),
            },
          })),
        },
      },
      include: {
        workoutDays: {
          include: { programDayExercises: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Program created successfully",
      data: program,
    });
  } catch (error) {
    console.error("Create program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create program",
    });
  }
});

// Update program with full functionality including workout days
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    console.log("Update program request:", {
      programId: req.params.id,
      userId: req.user!.userId,
      body: req.body,
    });

    // First, verify the program exists and user has permission
    const program = await prisma.workoutProgram.findUnique({
      where: { id: req.params.id },
      include: {
        workoutDays: {
          include: { programDayExercises: true },
        },
      },
    });

    if (!program) {
      console.log("Program not found:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Check if user is creator
    if (program.createdBy !== req.user!.userId) {
      console.log("User not authorized to edit program:", {
        programCreator: program.createdBy,
        currentUser: req.user!.userId,
      });
      return res.status(403).json({
        success: false,
        message: "You can only edit your own programs",
      });
    }

    const {
      name,
      description,
      difficulty,
      goal,
      daysPerWeek,
      durationWeeks,
      workoutDays,
      tags,
      isPublic,
      resourceLinks,
    } = req.body;

    console.log("Updating program with data:", {
      name,
      difficulty,
      goal,
      daysPerWeek,
      durationWeeks,
      workoutDaysCount: workoutDays?.length || 0,
    });

    // Start a transaction to update program and related data
    const updatedProgram = await prisma.$transaction(async (tx) => {
      // Update basic program fields
      const updateData: any = {
        name,
        description,
        difficulty,
        goal,
        daysPerWeek,
        durationWeeks,
        tags,
        isPublic,
        resourceLinks,
        updatedAt: new Date(),
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update program
      await tx.workoutProgram.update({
        where: { id: req.params.id },
        data: updateData,
      });

      // If workoutDays are provided, update them
      if (workoutDays && Array.isArray(workoutDays)) {
        // Delete existing workout days and exercises first
        await tx.programDayExercise.deleteMany({
          where: {
            workoutDay: {
              programId: req.params.id,
            },
          },
        });

        await tx.workoutDay.deleteMany({
          where: { programId: req.params.id },
        });

        // Create new workout days with exercises
        for (const day of workoutDays) {
          await tx.workoutDay.create({
            data: {
              programId: req.params.id,
              name: day.name,
              description: day.description,
              dayNumber: day.dayNumber,
              order: day.order,
              estimatedDuration: day.estimatedDuration,
              programDayExercises: {
                create: day.exercises.map((exercise: any) => ({
                  exerciseId: exercise.exerciseId,
                  exerciseName: exercise.exerciseName,
                  sets: exercise.sets,
                  repType: exercise.repType,
                  reps: exercise.reps,
                  maxReps: exercise.maxReps,
                  restInterval: exercise.restInterval,
                  notes: exercise.notes,
                  order: exercise.order,
                })),
              },
            },
          });
        }
      }

      // Return the updated program with all relations
      const result = await tx.workoutProgram.findUnique({
        where: { id: req.params.id },
        include: {
          workoutDays: {
            include: { programDayExercises: true },
            orderBy: { order: "asc" },
          },
        },
      });

      // Add explicit null check
      if (!result) {
        throw new Error("Failed to retrieve updated program");
      }

      return result;
    });

    // Add null check here too
    if (!updatedProgram) {
      return res.status(500).json({
        success: false,
        message: "Failed to update program: Could not retrieve updated data",
      });
    }

    // Transform to match frontend
    const transformedProgram = {
      ...updatedProgram,
      isCreator: updatedProgram.createdBy === req.user!.userId,
      workoutDays: updatedProgram.workoutDays.map((day) => ({
        id: day.id,
        name: day.name,
        description: day.description,
        dayNumber: day.dayNumber,
        order: day.order,
        estimatedDuration: day.estimatedDuration,
        exercises: day.programDayExercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets,
          repType: ex.repType,
          reps: ex.reps,
          maxReps: ex.maxReps,
          restInterval: ex.restInterval,
          notes: ex.notes,
          order: ex.order,
        })),
      })),
    };

    console.log("Program updated successfully:", updatedProgram.id);

    res.json({
      success: true,
      message: "Program updated successfully",
      data: transformedProgram,
    });
  } catch (error: any) {
    console.error("Update program error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    let errorMessage = "Failed to update program";
    if (error.code === "P2025") {
      errorMessage = "Program not found";
    } else if (error.code === "P2002") {
      errorMessage = "A program with this name already exists";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Delete program
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const program = await prisma.workoutProgram.findUnique({
      where: { id: req.params.id },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (program.createdBy !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own programs",
      });
    }

    await prisma.workoutProgram.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Program deleted successfully",
    });
  } catch (error) {
    console.error("Delete program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete program",
    });
  }
});

// Start program (set as active)
router.post("/:id/start", authenticateToken, async (req, res) => {
  try {
    const program = await prisma.workoutProgram.findUnique({
      where: { id: req.params.id },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Check if user already has an active program
    const existingActive = await prisma.activeProgram.findFirst({
      where: {
        userId: req.user!.userId,
        isActive: true,
      },
    });

    if (existingActive) {
      // Deactivate the current active program
      await prisma.activeProgram.update({
        where: { id: existingActive.id },
        data: { isActive: false },
      });
    }

    // Create new active program
    const activeProgram = await prisma.activeProgram.create({
      data: {
        userId: req.user!.userId,
        programId: program.id,
        startDate: new Date(),
        currentDayIndex: 0,
        progressPercentage: 0,
        streak: 0,
        isActive: true,
      },
      include: {
        program: {
          include: {
            workoutDays: {
              include: { programDayExercises: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Program started successfully",
      data: activeProgram,
    });
  } catch (error) {
    console.error("Start program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start program",
    });
  }
});

// Get active program
router.get("/active/current", authenticateToken, async (req, res) => {
  try {
    const activeProgram = await prisma.activeProgram.findFirst({
      where: {
        userId: req.user!.userId,
        isActive: true,
      },
      include: {
        program: {
          include: {
            workoutDays: {
              include: { programDayExercises: true },
            },
          },
        },
      },
    });

    if (!activeProgram) {
      return res.json({
        success: true,
        data: null,
        message: "No active program",
      });
    }

    // Transform program data
    const transformedActiveProgram = {
      ...activeProgram,
      program: {
        ...activeProgram.program,
        workoutDays: activeProgram.program.workoutDays.map((day) => ({
          id: day.id,
          name: day.name,
          description: day.description,
          dayNumber: day.dayNumber,
          order: day.order,
          estimatedDuration: day.estimatedDuration,
          exercises: day.programDayExercises.map((ex) => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            sets: ex.sets,
            repType: ex.repType,
            reps: ex.reps,
            maxReps: ex.maxReps,
            restInterval: ex.restInterval,
            notes: ex.notes,
            order: ex.order,
          })),
        })),
      },
    };

    res.json({
      success: true,
      data: transformedActiveProgram,
    });
  } catch (error) {
    console.error("Get active program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active program",
    });
  }
});

// server/src/routes/program.routes.ts
router.patch("/:id/deactivate", authenticateToken, async (req, res) => {
  try {
    console.log("🟢 DEACTIVATE ENDPOINT HIT");
    console.log("🔵 URL ID parameter:", req.params.id);
    console.log("🔵 User ID:", req.user!.userId);

    // Find the specific active program
    const activeProgram = await prisma.activeProgram.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
        isActive: true,
      },
    });

    console.log("🔵 Found active program:", activeProgram);

    if (!activeProgram) {
      console.log("❌ No active program found with ID:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "No active program found",
      });
    }

    console.log("🟢 Deactivating program:", activeProgram.id);

    // IMPORTANT: Check if there's already an inactive record
    const existingInactive = await prisma.activeProgram.findFirst({
      where: {
        userId: req.user!.userId,
        isActive: false,
        NOT: {
          id: activeProgram.id, // Don't include the one we're updating
        },
      },
    });

    // Use a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // If there's already an inactive record, DELETE it first
      if (existingInactive) {
        console.log("🟡 Deleting old inactive record:", existingInactive.id);
        await tx.activeProgram.delete({
          where: { id: existingInactive.id },
        });
      }

      // Now update the current program to inactive
      const updated = await tx.activeProgram.update({
        where: { id: activeProgram.id },
        data: {
          isActive: false,
          nextWorkoutDate: null,
        },
      });

      return updated;
    });

    console.log("✅ Deactivation successful. Updated record:", result.id);

    res.json({
      success: true,
      message: "Program deactivated successfully",
      data: {
        deactivatedProgramId: activeProgram.programId,
        activeProgramId: activeProgram.id,
      },
    });
  } catch (error: any) {
    console.error("❌ DEACTIVATE ERROR:", error);
    console.error("❌ Error message:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate program",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.put("/active-programs/:id", authenticateToken, async (req, res) => {
  try {
    const { progressPercentage } = req.body;

    const activeProgram = await prisma.activeProgram.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });

    if (!activeProgram) {
      return res.status(404).json({
        success: false,
        message: "Active program not found",
      });
    }

    await prisma.activeProgram.update({
      where: { id: req.params.id },
      data: { progressPercentage },
    });

    res.json({
      success: true,
      message: "Program progress updated",
    });
  } catch (error) {
    console.error("Update active program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update program progress",
    });
  }
});

export default router;
