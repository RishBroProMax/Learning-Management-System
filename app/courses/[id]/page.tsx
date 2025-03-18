import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import MainLayout from "@/components/main-layout"
import { createServerSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Clock, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import EnrollButton from "./enroll-button"

async function getCourseDetails(courseId: string, userId: string) {
  const supabase = createServerSupabaseClient()

  // Get course details
  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      *,
      instructor:instructor_id(
        id,
        full_name,
        avatar_url
      ),
      tags:course_tags(
        tags:tag_id(
          id,
          name
        )
      ),
      lessons(
        id,
        title,
        description,
        video_url,
        position
      )
    `)
    .eq("id", courseId)
    .single()

  if (error) {
    console.error("Error fetching course:", error)
    return null
  }

  // Check if user is enrolled
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("course_enrollments")
    .select(`
      *,
      user_progress(
        progress_percentage
      )
    `)
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .single()

  if (enrollmentError && enrollmentError.code !== "PGRST116") {
    console.error("Error checking enrollment:", enrollmentError)
  }

  // Get lesson progress if enrolled
  let lessonProgress = null
  if (enrollment) {
    const { data: progress, error: progressError } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", userId)
      .in(
        "lesson_id",
        course.lessons.map((l) => l.id),
      )

    if (progressError) {
      console.error("Error fetching lesson progress:", progressError)
    } else {
      lessonProgress = progress
    }
  }

  return {
    course,
    isEnrolled: !!enrollment,
    progress: enrollment?.user_progress?.[0]?.progress_percentage || 0,
    lessonProgress,
  }
}

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const courseData = await getCourseDetails(params.id, session.user.id)

  if (!courseData) {
    redirect("/courses")
  }

  const { course, isEnrolled, progress, lessonProgress } = courseData

  // Sort lessons by position
  const sortedLessons = [...course.lessons].sort((a, b) => a.position - b.position)

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/courses" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Courses
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline">{course.difficulty_level}</Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  {course.duration_minutes} minutes
                </div>
              </div>
            </div>

            {!isEnrolled && <EnrollButton courseId={course.id} userId={session.user.id} />}
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_300px] gap-6">
          <div>
            <Tabs defaultValue="content">
              <TabsList className="mb-4">
                <TabsTrigger value="content">Course Content</TabsTrigger>
                <TabsTrigger value="about">About this course</TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <Card>
                  <CardHeader>
                    <CardTitle>Lessons</CardTitle>
                    <CardDescription>
                      {isEnrolled
                        ? "Click on a lesson to start learning"
                        : "Enroll in this course to access the lessons"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sortedLessons.map((lesson, index) => {
                        const lessonCompleted = lessonProgress?.some((lp) => lp.lesson_id === lesson.id && lp.completed)

                        return (
                          <div key={lesson.id} className="border rounded-lg p-4 hover:bg-accent transition-colors">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Lesson {index + 1}</span>
                                  {lessonCompleted && <Badge variant="success">Completed</Badge>}
                                </div>
                                <h3 className="text-lg font-medium mt-1">{lesson.title}</h3>
                                {lesson.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                                )}
                              </div>

                              {isEnrolled ? (
                                <Link href={`/courses/${course.id}/lessons/${lesson.id}`}>
                                  <Button size="sm">{lessonCompleted ? "Review" : "Start"}</Button>
                                </Link>
                              ) : (
                                <Button size="sm" disabled>
                                  Locked
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle>About this course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <p>{course.description}</p>

                      <h3 className="text-lg font-medium mt-6">Tags</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {course.tags.map((tag) => (
                          <Badge key={tag.tags.id} variant="secondary">
                            {tag.tags.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {isEnrolled ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span>{progress}% complete</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {sortedLessons.length} lessons in this course
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lessonProgress?.filter((lp) => lp.completed).length || 0} lessons completed
                      </p>
                    </div>

                    {progress === 0 && (
                      <Button className="w-full mt-4" asChild>
                        <Link href={`/courses/${course.id}/lessons/${sortedLessons[0]?.id}`}>Start Learning</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">Enroll in this course to track your progress</p>
                    <EnrollButton courseId={course.id} userId={session.user.id} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-4">
                    <AvatarImage src={course.instructor?.avatar_url || ""} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{course.instructor?.full_name || "Instructor"}</p>
                    <p className="text-sm text-muted-foreground">Course Instructor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

