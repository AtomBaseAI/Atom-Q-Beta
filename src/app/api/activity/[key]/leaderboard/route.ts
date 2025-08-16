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

    // Get leaderboard data
    const leaderboard = await prisma.activityParticipant.findMany({
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
      orderBy: [
        { score: "desc" },
        { joinedAt: "asc" },
      ],
    });

    // Update ranks
    const leaderboardWithRanks = leaderboard.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));

    return NextResponse.json(leaderboardWithRanks);
  } catch (error) {
    console.error("Error fetching activity leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}