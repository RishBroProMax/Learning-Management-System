import { type NextRequest, NextResponse } from "next/server"
import { createQuizAttempt, generateId } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const { userId, startedAt } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const quizId = params.quizId

    const attempt = await createQuizAttempt({
      id: generateId(),
      userId,
      quizId,
      score: 0,
      passed: false,
      startedAt: new Date(startedAt),
      responses: [],
    })

    return NextResponse.json({ success: true, attempt })
  } catch (error) {
    console.error("Error creating quiz attempt:", error)
    return NextResponse.json({ error: "Failed to create quiz attempt" }, { status: 500 })
  }
}

