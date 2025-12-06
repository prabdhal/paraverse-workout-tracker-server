import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            workoutLogs: true,
            workoutPrograms: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// Update user profile
router.put("/", authenticateToken, async (req, res) => {
  try {
    const { name, avatarUrl, bio, preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        name,
        avatarUrl,
        bio,
        preferences,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// Get public profile (for other users)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            workoutLogs: {
              where: { completed: true },
            },
            workoutPrograms: {
              where: { isPublic: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's public programs
    const programs = await prisma.workoutProgram.findMany({
      where: {
        createdBy: userId,
        isPublic: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: {
        ...user,
        programs,
      },
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

export default router;
