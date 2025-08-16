import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuestionType, DifficultyLevel } from "@prisma/client";
import { z } from "zod";

const createQuestionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.nativeEnum(QuestionType),
  options: z.string().min(1, "Options are required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  explanation: z.string().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  order: z.number().int().min(1, "Order must be a positive integer").optional(),
  points: z.number().min(0, "Points must be non-negative").optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { aid: string } }
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
    const activity = await prisma.activity.findUnique({
      where: { id: params.aid },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const questions = await prisma.activityQuestion.findMany({
      where: { activityId: params.aid },
      include: {
        question: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching activity questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { aid: string } }
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
    const validatedData = createQuestionSchema.parse(body);

    // Check if activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: params.aid },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Create the question first
    const question = await prisma.question.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        type: validatedData.type,
        options: validatedData.options,
        correctAnswer: validatedData.correctAnswer,
        explanation: validatedData.explanation,
        difficulty: validatedData.difficulty || DifficultyLevel.MEDIUM,
        isActive: true,
      },
    });

    // Get the highest order number for this activity
    const highestOrder = await prisma.activityQuestion.findFirst({
      where: { activityId: params.aid },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = highestOrder ? highestOrder.order + 1 : 1;

    // Create the activity question
    const activityQuestion = await prisma.activityQuestion.create({
      data: {
        activityId: params.aid,
        questionId: question.id,
        order: validatedData.order || nextOrder,
        points: validatedData.points || 1.0,
      },
      include: {
        question: true,
      },
    });

    return NextResponse.json(activityQuestion, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating activity question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}