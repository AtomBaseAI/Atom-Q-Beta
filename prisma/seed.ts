
import { PrismaClient, UserRole, DifficultyLevel, QuizStatus, QuestionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data in proper order to avoid constraint issues
  await prisma.quizAnswer.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.quizUser.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.question.deleteMany()
  await prisma.questionGroup.deleteMany()
  await prisma.quiz.deleteMany() 
  await prisma.user.deleteMany()

  console.log('Cleaned existing data...')

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@atomq', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@atomcode.dev',
      name: 'Atom Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  console.log('Created admin user:', admin.email)

  console.log('✅ Demo data seeded successfully!')
  console.log('🔑 Admin: admin@demo.com / admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })