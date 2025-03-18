import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../../api/auth/[...nextauth]/route"
import MainLayout from "@/components/main-layout"
import { createServerSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import VideoPlayer from "./video-player"
import QuizComponent from "./quiz"

async function getLessonDetails(courseId: string, lessonId: string, userId: string) {
  const supabase = createServerSupabaseClient()

  // Check if user is enrolled
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .single()

  if (enrollmentError) {
    console.error("Error checking enrollment:", enrollmentError)
    return null
  }

  // Get lesson details
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(`
      *,
      course:course_id(
        title
      )
    `)
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .single()

  if (lessonError) {
    console.error("Error fetching lesson:", lessonError)
    return null
  }

  // Get quiz for this lesson
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions:quiz_questions(
        id,
        question,
        question_type,
        position,
        points,
        options:quiz_options(
          id,
          option_text,
          is_correct,
          position
        )
      )
    `)
    .eq("lesson_id", lessonId)
    .single()

  if (quizError && quizError.code !== "PGRST116") {
    console.error("Error fetching quiz:", quizError)
  }

  // Get lesson progress
  const { data: progress, error: progressError } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .single()

  if (progressError && progressError.code !== "PGRST116") {
    console.error("Error fetching lesson progress:", progressError)
  }

  // Get previous and next lessons
  const { data: courseLessons, error: courseLessonsError } = await supabase
    .from("lessons")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true })

  if (courseLessonsError) {
    console.error("Error fetching course lessons:", courseLessonsError)
  }

  let prevLesson = null
  let nextLesson = null

  if (courseLessons) {
    const currentIndex = courseLessons.findIndex((l) => l.id === Number.parseInt(lessonId))

    if (currentIndex > 0) {
      prevLesson = courseLessons[currentIndex - 1]
    }

    if (currentIndex < courseLessons.length - 1) {
      nextLesson = courseLessons[currentIndex + 1]
    }
  }

  // Get quiz attempts
  let quizAttempts = null
  if (quiz) {
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quiz.id)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })

    if (attemptsError) {
      console.error("Error fetching quiz attempts:", attemptsError)
    } else {
      quizAttempts = attempts
    }
  }

  return {
    lesson,
    quiz,
    progress,
    prevLesson,
    nextLesson,
    quizAttempts,
  }
}

export default async function LessonPage({
  params,
}: {
  params: { id: string; lessonId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const lessonData = await getLessonDetails(params.id, params.lessonId, session.user.id)

  if (!lessonData) {
    redirect(`/courses/${params.id}`)
  }

  const { lesson, quiz, progress, prevLesson, nextLesson, quizAttempts } = lessonData

  const hasPassedQuiz = quizAttempts?.some((attempt) => attempt.passed)
  const lessonCompleted = progress?.completed || hasPassedQuiz

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/courses/${params.id}`}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {lesson.course.title}
          </Link>

          <h1 className="text-3xl font-bold">{lesson.title}</h1>
        </div>

        <Tabs defaultValue="video">
          <TabsList className="mb-4">
            <TabsTrigger value="video">Video</TabsTrigger>
            {quiz && <TabsTrigger value="quiz">Quiz</TabsTrigger>}
          </TabsList>

          <TabsContent value="video">
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <Card className="overflow-hidden">
                <VideoPlayer
                  videoUrl={lesson.video_url || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
                  lessonId={Number.parseInt(params.lessonId)}
                  userId={session.user.id}
                  completed={lessonCompleted}
                />

                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                  {lesson.description && (
                    <div className="prose dark:prose-invert max-w-none">
                      <p>{lesson.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson Navigation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      {prevLesson ? (
                        <Link href={`/courses/${params.id}/lessons/${prevLesson.id}`}>
                          <Button variant="outline" className="w-full justify-start">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Previous Lesson
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" className="w-full justify-start" disabled>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Previous Lesson
                        </Button>
                      )}

                      {nextLesson ? (
                        <Link href={`/courses/${params.id}/lessons/${nextLesson.id}`}>
                          <Button variant="outline" className="w-full justify-between">
                            Next Lesson
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" className="w-full justify-between" disabled>
                          Next Lesson
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {quiz && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Quiz</CardTitle>
                      <CardDescription>Test your knowledge of this lesson</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">
                        {hasPassedQuiz
                          ? "You have successfully completed the quiz!"
                          : "Complete the quiz to mark this lesson as completed"}
                      </p>
                      <Button asChild>
                        <TabsTrigger value="quiz">{hasPassedQuiz ? "Review Quiz" : "Take Quiz"}</TabsTrigger>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {quiz && (
            <TabsContent value="quiz">
              <Card>
                <CardHeader>
                  <CardTitle>{quiz.title}</CardTitle>
                  <CardDescription>{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <QuizComponent quiz={quiz} userId={session.user.id} attempts={quizAttempts || []} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  )
}

