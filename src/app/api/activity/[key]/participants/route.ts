import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    // Find activity by access key
    const activity = await prisma.activity.findUnique({
      where: { accessKey: params.key.toUpperCase() },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Get all participants with their user details
    const participants = await prisma.activityParticipant.findMany({
      where: {
        activityId: activity.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        score: "desc",
      },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching activity participants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}