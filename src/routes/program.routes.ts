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
          include: { exercises: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: programs.map((program) => ({
        ...program,
        isCreator: program.createdBy === req.user!.userId,
      })),
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
          include: { exercises: true },
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

    res.json({
      success: true,
      data: {
        ...program,
        isCreator: program.createdBy === req.user!.userId,
      },
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
            exercises: {
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
          include: { exercises: true },
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

// Update program (basic fields only - no workoutDays for now)
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
    });

    // Update only basic fields for now
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

    console.log("Final update data:", updateData);

    const updatedProgram = await prisma.workoutProgram.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        workoutDays: {
          include: { exercises: true },
          orderBy: { order: "asc" },
        },
      },
    });

    console.log("Program updated successfully:", updatedProgram.id);

    res.json({
      success: true,
      message: "Program updated successfully",
      data: updatedProgram,
    });
  } catch (error: any) {
    console.error("Update program error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
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

    // Deactivate any current active program
    await prisma.activeProgram.updateMany({
      where: { userId: req.user!.userId },
      data: { isActive: false },
    });

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
              include: { exercises: true },
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
              include: { exercises: true },
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

    res.json({
      success: true,
      data: activeProgram,
    });
  } catch (error) {
    console.error("Get active program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active program",
    });
  }
});

router.patch("/:id/deactivate", authenticateToken, async (req, res) => {
  try {
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
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "Program deactivated",
    });
  } catch (error) {
    console.error("Deactivate program error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate program",
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
