import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ActivityStatus } from "@prisma/client";
import { z } from "zod";

const updateActivitySchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  accessKey: z.string().min(1, "Access key is required").optional(),
  status: z.nativeEnum(ActivityStatus).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
            participants: true,
            sessions: true,
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateActivitySchema.parse(body);

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id: params.id },
    });

    if (!existingActivity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // If access key is being updated, check if it already exists
    if (validatedData.accessKey && validatedData.accessKey !== existingActivity.accessKey) {
      const activityWithSameKey = await prisma.activity.findUnique({
        where: { accessKey: validatedData.accessKey },
      });

      if (activityWithSameKey) {
        return NextResponse.json(
          { error: "Access key already exists" },
          { status: 400 }
        );
      }
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.accessKey && { accessKey: validatedData.accessKey }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.startTime && { startTime: new Date(validatedData.startTime) }),
        ...(validatedData.endTime && { endTime: new Date(validatedData.endTime) }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
            participants: true,
            sessions: true,
          },
        },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id: params.id },
    });

    if (!existingActivity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    await prisma.activity.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}