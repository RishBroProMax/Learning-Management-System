import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import MainLayout from "@/components/main-layout"
import { createServerSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Clock, BookOpen, CheckCircle } from "lucide-react"

async function getCourses(userId: string) {
  const supabase = createServerSupabaseClient()

  // Get enrolled courses with progress
  const { data: enrolledCourses, error: enrolledError } = await supabase
    .from("course_enrollments")
    .select(`
      course_id,
      courses:course_id(
        id,
        title,
        description,
        image_url,
        difficulty_level,
        duration_minutes
      ),
      user_progress:user_progress(progress_percentage)
    `)
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false })

  if (enrolledError) {
    console.error("Error fetching enrolled courses:", enrolledError)
    return { enrolledCourses: [], availableCourses: [] }
  }

  // Get all published courses
  const { data: allCourses, error: allCoursesError } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      image_url,
      difficulty_level,
      duration_minutes,
      tags:course_tags(
        tags:tag_id(
          id,
          name
        )
      )
    `)
    .eq("published", true)
    .order("created_at", { ascending: false })

  if (allCoursesError) {
    console.error("Error fetching all courses:", allCoursesError)
    return { enrolledCourses: enrolledCourses || [], availableCourses: [] }
  }

  // Filter out enrolled courses from available courses
  const enrolledIds = enrolledCourses?.map((ec) => ec.course_id) || []
  const availableCourses = allCourses?.filter((course) => !enrolledIds.includes(course.id)) || []

  return {
    enrolledCourses: enrolledCourses || [],
    availableCourses,
  }
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const { enrolledCourses, availableCourses } = await getCourses(session.user.id)

  const completedCourses = enrolledCourses.filter(
    (course) => course.user_progress?.[0]?.progress_percentage === 100,
  ).length

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {session.user.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Here's an overview of your learning progress.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Available Courses</CardTitle>
              <CardDescription>Courses you can access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{availableCourses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Completed</CardTitle>
              <CardDescription>Courses you've completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedCourses}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Continue Learning</h2>
            <Link href="/courses">
              <Button variant="outline">View All Courses</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((enrollment) => {
                const course = enrollment.courses
                const progress = enrollment.user_progress?.[0]?.progress_percentage || 0

                return (
                  <Card key={course.id} className="overflow-hidden">
                    <div className="aspect-video w-full bg-muted">
                      {course.image_url ? (
                        <img
                          src={course.image_url || "/placeholder.svg"}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-secondary">
                          <BookOpen className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{course.difficulty_level}</Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-4 w-4" />
                          {course.duration_minutes} minutes
                        </div>
                      </div>
                      <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {progress === 100 ? "Completed" : `${progress}% complete`}
                        </span>
                        {progress === 100 && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      <Progress value={progress} className="h-2" />
                    </CardContent>
                    <div className="p-4 pt-0">
                      <Link href={`/courses/${course.id}`}>
                        <Button className="w-full">
                          {progress === 0 ? "Start Course" : progress === 100 ? "Review Course" : "Continue Course"}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <h3 className="text-lg font-medium mb-2">You haven't enrolled in any courses yet</h3>
                <p className="text-muted-foreground mb-4">Browse available courses and start learning today</p>
                <Link href="/courses">
                  <Button>Browse Courses</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {availableCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Recommended Courses</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableCourses.slice(0, 3).map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <div className="aspect-video w-full bg-muted">
                    {course.image_url ? (
                      <img
                        src={course.image_url || "/placeholder.svg"}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-secondary">
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{course.difficulty_level}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        {course.duration_minutes} minutes
                      </div>
                    </div>
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((tag) => (
                        <Badge key={tag.tags.id} variant="secondary">
                          {tag.tags.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Link href={`/courses/${course.id}`}>
                      <Button className="w-full">Enroll Now</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

