import { type NextRequest, NextResponse } from "next/server"
import {
  getLessonProgress,
  updateLessonProgress,
  updateUserProgress,
  getLessonById,
  getLessonsByCourseId,
} from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const lessonId = params.lessonId
    const progress = await getLessonProgress(userId, lessonId)

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Error fetching lesson progress:", error)
    return NextResponse.json({ error: "Failed to fetch lesson progress" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const { userId, watchedSeconds, completed, completedAt } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const lessonId = params.lessonId

    // Update lesson progress
    const progress = await updateLessonProgress(userId, lessonId, {
      watchedSeconds,
      completed,
      completedAt: completedAt ? new Date(completedAt) : undefined,
    })

    // If lesson is completed, update course progress
    if (completed) {
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

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error("Error updating lesson progress:", error)
    return NextResponse.json({ error: "Failed to update lesson progress" }, { status: 500 })
  }
}

