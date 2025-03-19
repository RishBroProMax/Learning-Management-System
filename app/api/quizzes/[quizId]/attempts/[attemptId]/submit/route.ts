import { type NextRequest, NextResponse } from "next/server"
import {
  updateQuizAttempt,
  getLessonById,
  updateLessonProgress,
  updateUserProgress,
  getLessonsByCourseId,
  getLessonProgress,
} from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { quizId: string; attemptId: string } }) {
  try {
    const { userId, responses, score, passed, completedAt } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const quizId = params.quizId
    const attemptId = params.attemptId

    // Update quiz attempt
    const attempt = await updateQuizAttempt(attemptId, {
      score,
      passed,
      completedAt: new Date(completedAt),
      responses,
    })

    // If passed, mark lesson as completed
    if (passed) {
      // Get quiz to find lesson ID
      const response = await fetch(`/api/quizzes/${quizId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch quiz")
      }

      const quizData = await response.json()
      const lessonId = quizData.quiz.lessonId

      if (lessonId) {
        // Mark lesson as completed
        await updateLessonProgress(userId, lessonId, {
          completed: true,
          completedAt: new Date(completedAt),
        })

        // Get lesson to find course ID
        const lesson = await getLessonById(lessonId)

        if (lesson) {
          const courseId = lesson.courseId

          // Get all lessons for this course
          const courseLessons = await getLessonsByCourseId(courseId)

          // Get completed lessons
          const completedLessons = await Promise.all(
            courseLessons.map(async (lesson) => {
              const progress = await getLessonProgress(userId, lesson.id)
              return { lesson, completed: progress?.completed || false }
            }),
          )

          const totalLessons = courseLessons.length
          const completedCount = completedLessons.filter((item) => item.completed).length
          const progressPercentage = Math.round((completedCount / totalLessons) * 100)

          // Update course progress
          await updateUserProgress(userId, courseId, {
            progressPercentage,
            completedAt: progressPercentage === 100 ? new Date() : undefined,
          })
        }
      }
    }

    return NextResponse.json({ success: true, attempt })
  } catch (error) {
    console.error("Error submitting quiz attempt:", error)
    return NextResponse.json({ error: "Failed to submit quiz attempt" }, { status: 500 })
  }
}

