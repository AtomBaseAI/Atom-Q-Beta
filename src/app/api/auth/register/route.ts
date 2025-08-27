import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone } = await request.json()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Check if registration is allowed
    let settings = await db.settings.findFirst()
    
    // If no settings exist, create default settings and allow registration
    if (!settings) {
      settings = await db.settings.create({
        data: {
          siteTitle: 'Atom Q',
          siteDescription: 'Take quizzes and test your knowledge',
          maintenanceMode: false,
          allowRegistration: true,
          enableGithubAuth: false,
        },
      })
    }
    
    if (!settings.allowRegistration) {
      return NextResponse.json(
        { message: "Registration is currently disabled" },
        { status: 403 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: UserRole.USER,
      }
    })

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "An error occurred during registration. Please try again." },
      { status: 500 }
    )
  }
}