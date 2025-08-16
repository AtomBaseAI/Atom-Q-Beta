import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ActivityStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ActivityStatus | null;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
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
    console.error("Error fetching user activities:", error);
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

    const body = await request.json();
    const { accessKey } = body;

    if (!accessKey) {
      return NextResponse.json(
        { error: "Access key is required" },
        { status: 400 }
      );
    }

    // Find activity by access key
    const activity = await prisma.activity.findUnique({
      where: { accessKey: accessKey.toUpperCase() },
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
      return NextResponse.json(
        { error: "Invalid access key" },
        { status: 404 }
      );
    }

    if (activity.status !== ActivityStatus.ACTIVE) {
      return NextResponse.json(
        { error: "Activity is not currently active" },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.activityParticipant.findUnique({
      where: {
        activityId_userId: {
          activityId: activity.id,
          userId: session.user.id,
        },
      },
    });

    if (!existingParticipant) {
      // Add user as participant
      await prisma.activityParticipant.create({
        data: {
          activityId: activity.id,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error joining activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}