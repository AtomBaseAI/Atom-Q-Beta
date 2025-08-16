import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SessionStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find activity by access key
    const activity = await prisma.activity.findUnique({
      where: { accessKey: params.key.toUpperCase() },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Get or create user session
    let userSession = await prisma.activitySession.findFirst({
      where: {
        activityId: activity.id,
      },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!userSession) {
      userSession = await prisma.activitySession.create({
        data: {
          activityId: activity.id,
          status: SessionStatus.WAITING,
        },
        include: {
          answers: {
            include: {
              question: true,
            },
          },
        },
      });
    }

    return NextResponse.json(userSession);
  } catch (error) {
    console.error("Error fetching activity session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, questionId, userAnswer, timeSpent } = body;

    // Find activity by access key
    const activity = await prisma.activity.findUnique({
      where: { accessKey: params.key.toUpperCase() },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Get or create user session
    let userSession = await prisma.activitySession.findFirst({
      where: {
        activityId: activity.id,
      },
    });

    if (!userSession) {
      userSession = await prisma.activitySession.create({
        data: {
          activityId: activity.id,
          status: SessionStatus.WAITING,
        },
      });
    }

    if (action === "start") {
      // Start the quiz session
      userSession = await prisma.activitySession.update({
        where: { id: userSession.id },
        data: {
          status: SessionStatus.PLAYING,
          startTime: new Date(),
          currentQuestion: 0,
        },
      });

      return NextResponse.json(userSession);
    }

    if (action === "answer" && questionId && userAnswer !== undefined) {
      // Submit an answer
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }

      const isCorrect = userAnswer === question.correctAnswer;
      const pointsEarned = isCorrect ? 1000 - (timeSpent || 0) * 50 : 0;

      // Save the answer
      const answer = await prisma.activityAnswer.create({
        data: {
          sessionId: userSession.id,
          questionId: questionId,
          userAnswer: userAnswer,
          isCorrect: isCorrect,
          pointsEarned: Math.max(0, pointsEarned),
          timeSpent: timeSpent,
        },
      });

      // Update participant score
      await prisma.activityParticipant.updateMany({
        where: {
          activityId: activity.id,
          userId: session.user.id,
        },
        data: {
          score: {
            increment: Math.max(0, pointsEarned),
          },
        },
      });

      return NextResponse.json(answer);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error handling activity session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}