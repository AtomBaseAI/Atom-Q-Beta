import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ActivityStatus } from "@prisma/client";
import { z } from "zod";

const createActivitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  accessKey: z.string().min(1, "Access key is required"),
  status: z.nativeEnum(ActivityStatus).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const updateActivitySchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  accessKey: z.string().min(1, "Access key is required").optional(),
  status: z.nativeEnum(ActivityStatus).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await prisma.activity.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createActivitySchema.parse(body);

    // Check if access key already exists
    const existingActivity = await prisma.activity.findUnique({
      where: { accessKey: validatedData.accessKey },
    });

    if (existingActivity) {
      return NextResponse.json(
        { error: "Access key already exists" },
        { status: 400 }
      );
    }

    const activity = await prisma.activity.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        accessKey: validatedData.accessKey,
        status: validatedData.status || ActivityStatus.DRAFT,
        startTime: validatedData.startTime ? new Date(validatedData.startTime) : null,
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
        creatorId: session.user.id,
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

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}