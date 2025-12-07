// server/src/routes/profile.routes.ts - FIXED
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
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get counts separately
    const [workoutCount, programCount] = await Promise.all([
      prisma.workoutLog.count({
        // Changed from workout to workoutLog
        where: {
          userId: req.user!.userId,
          completed: true,
        },
      }),
      prisma.workoutProgram.count({
        // Changed from program to workoutProgram
        where: {
          createdBy: req.user!.userId,
        },
      }),
    ]);

    // Parse preferences JSON if it's a string
    const parsedPreferences =
      typeof user.preferences === "string"
        ? JSON.parse(user.preferences)
        : user.preferences || {};

    res.json({
      success: true,
      data: {
        ...user,
        preferences: parsedPreferences,
        _count: {
          workouts: workoutCount,
          programs: programCount,
        },
      },
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
    const { name, avatarUrl, bio, preferences, socialLinks } = req.body;

    // Get existing user to merge preferences
    const existingUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { preferences: true },
    });

    // Parse existing preferences
    const existingPreferences = existingUser?.preferences
      ? typeof existingUser.preferences === "string"
        ? JSON.parse(existingUser.preferences)
        : existingUser.preferences
      : {};

    // Merge preferences (keeping existing theme, notifications, etc.)
    const mergedPreferences = {
      ...existingPreferences,
      ...preferences,
      // Add socialLinks to preferences if provided
      ...(socialLinks && { socialLinks }),
    };

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        name,
        avatarUrl,
        bio,
        preferences: mergedPreferences,
      },
    });

    // Get updated counts
    const [workoutCount, programCount] = await Promise.all([
      prisma.workoutLog.count({
        where: {
          userId: req.user!.userId,
          completed: true,
        },
      }),
      prisma.workoutProgram.count({
        where: {
          createdBy: req.user!.userId,
        },
      }),
    ]);

    // Parse preferences for response
    const parsedPreferences =
      typeof updatedUser.preferences === "string"
        ? JSON.parse(updatedUser.preferences)
        : updatedUser.preferences || {};

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        ...updatedUser,
        preferences: parsedPreferences,
        _count: {
          workouts: workoutCount,
          programs: programCount,
        },
      },
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
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get counts separately
    const [workoutCount, programCount] = await Promise.all([
      prisma.workoutLog.count({
        where: {
          userId: userId,
          completed: true,
        },
      }),
      prisma.workoutProgram.count({
        where: {
          createdBy: userId,
          isPublic: true,
        },
      }),
    ]);

    // Parse preferences
    const preferences =
      typeof user.preferences === "string"
        ? JSON.parse(user.preferences)
        : user.preferences || {};

    // Check if profile is public
    if (!preferences.publicProfile && req.user?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "This profile is private",
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

    // Transform data for public view
    const publicData = {
      id: user.id,
      username: user.email?.split("@")[0] || "user",
      displayName: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      socialLinks: preferences.socialLinks || [],
      preferences: {
        publicProfile: preferences.publicProfile || false,
        showStats: preferences.showStats || false,
        showWorkouts: preferences.showWorkouts || false,
      },
      stats: {
        totalWorkouts: workoutCount,
        totalPrograms: programCount,
        followers: 0, // Would come from followers table
        following: 0,
      },
      programs,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: publicData,
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
