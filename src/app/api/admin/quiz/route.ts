import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, DifficultyLevel, QuizStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const quizzes = await db.quiz.findMany({
      include: {
        _count: {
          select: {
            quizQuestions: true,
            quizAttempts: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(quizzes)
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify that the user still exists in the database
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found. Please log in again." },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Check if this is an import request
    if (body.importData && Array.isArray(body.importData)) {
      const { importData } = body
      const createdQuizzes = []

      for (const quizData of importData) {
        // Skip empty rows
        if (!quizData.title || quizData.title.trim() === "") continue

        try {
          const quiz = await db.quiz.create({
            data: {
              title: quizData.title,
              description: quizData.description || null,
              timeLimit: quizData.timeLimit ? parseInt(quizData.timeLimit) : null,
              difficulty: quizData.difficulty || DifficultyLevel.MEDIUM,
              status: quizData.status || QuizStatus.ACTIVE,
              negativeMarking: quizData.negativeMarking === true || quizData.negativeMarking === "true",
              negativePoints: quizData.negativePoints ? parseFloat(quizData.negativePoints) : 0.5,
              randomOrder: quizData.randomOrder === true || quizData.randomOrder === "true",
              maxAttempts: quizData.maxAttempts && quizData.maxAttempts !== "" ? parseInt(quizData.maxAttempts) : null,
              checkAnswerEnabled: quizData.checkAnswerEnabled === true || quizData.checkAnswerEnabled === "true",
              creatorId: session.user.id,
            },
            include: {
              _count: {
                select: {
                  quizQuestions: true,
                  quizAttempts: true,
                }
              }
            }
          })
          createdQuizzes.push(quiz)
        } catch (error) {
          console.error("Error creating quiz from import:", error)
          // Continue with other quizzes even if one fails
        }
      }

      return NextResponse.json({ 
        message: `Successfully imported ${createdQuizzes.length} quizzes`,
        quizzes: createdQuizzes 
      }, { status: 201 })
    }

    // Regular quiz creation
    const { 
      title, 
      description, 
      timeLimit, 
      difficulty, 
      negativeMarking, 
      negativePoints, 
      randomOrder, 
      maxAttempts, 
      startTime, 
      endTime,
      checkAnswerEnabled
    } = body

    const quiz = await db.quiz.create({
      data: {
        title,
        description,
        timeLimit,
        difficulty: difficulty || DifficultyLevel.MEDIUM,
        status: QuizStatus.ACTIVE,
        negativeMarking: negativeMarking || false,
        negativePoints: negativePoints || 0.5,
        randomOrder: randomOrder || false,
        maxAttempts: maxAttempts && maxAttempts !== "" ? parseInt(maxAttempts) : null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        checkAnswerEnabled: checkAnswerEnabled || false,
        creatorId: session.user.id,
      },
      include: {
        _count: {
          select: {
            quizQuestions: true,
            quizAttempts: true,
          }
        }
      }
    })

    return NextResponse.json(quiz, { status: 201 })
  } catch (error) {
    console.error("Error creating quiz:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}