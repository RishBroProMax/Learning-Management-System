import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../api/auth/[...nextauth]/route"
import MainLayout from "@/components/main-layout"
import { createServerSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Book, Clock } from "lucide-react"
import Link from "next/link"

async function getUserProfile(userId: string) {
  const supabase = createServerSupabaseClient()

  // Get user profile
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  // Get user stats
  const { data: enrolledCourses, error: enrolledError } = await supabase
    .from("course_enrollments")
    .select(`
      course_id,
      courses:course_id(
        id,
        title
      ),
      user_progress:user_progress(progress_percentage)
    `)
    .eq("user_id", userId)

  if (enrolledError) {
    console.error("Error fetching enrolled courses:", enrolledError)
  }

  // Get completed courses
  const completedCourses =
    enrolledCourses?.filter((course) => course.user_progress?.[0]?.progress_percentage === 100) || []

  // Calculate average score from quiz attempts
  const { data: quizAttempts, error: quizError } = await supabase
    .from("quiz_attempts")
    .select("score, passed")
    .eq("user_id", userId)
    .not("score", "is", null)

  if (quizError) {
    console.error("Error fetching quiz attempts:", quizError)
  }

  const averageScore = quizAttempts?.length
    ? Math.round(quizAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / quizAttempts.length)
    : 0

  return {
    profile,
    stats: {
      enrolledCourses: enrolledCourses?.length || 0,
      completedCourses: completedCourses.length,
      averageScore,
      hoursSpent: 1, // Placeholder, would need to calculate from actual time spent
    },
    courseProgress: enrolledCourses || [],
  }
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const userData = await getUserProfile(session.user.id)

  if (!userData) {
    redirect("/dashboard")
  }

  const { profile, stats, courseProgress } = userData

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">View and manage your profile information</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="text-lg">
                      {getInitials(profile.full_name || profile.username)}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="text-xl font-bold">{profile.full_name || profile.username}</h2>
                  <Badge className="mt-1">{profile.role}</Badge>

                  <div className="mt-4 space-y-2 text-left w-full">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{session.user.email}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Username</p>
                      <p className="text-sm text-muted-foreground">{profile.username}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium">Joined</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {profile.bio && (
                      <div>
                        <p className="text-sm font-medium">Bio</p>
                        <p className="text-sm text-muted-foreground">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" asChild>
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Statistics</CardTitle>
                <CardDescription>Your learning progress and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <Book className="h-8 w-8 mb-2" />
                    <p className="text-2xl font-bold">{stats.enrolledCourses}</p>
                    <p className="text-sm text-muted-foreground">Available Courses</p>
                  </div>

                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <Badge className="h-8 w-8 mb-2 flex items-center justify-center">{stats.completedCourses}</Badge>
                    <p className="text-2xl font-bold">{stats.completedCourses}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>

                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <div className="h-8 w-8 mb-2 flex items-center justify-center font-bold">{stats.averageScore}%</div>
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>

                  <div className="flex flex-col items-center p-4 border rounded-lg">
                    <Clock className="h-8 w-8 mb-2" />
                    <p className="text-2xl font-bold">{stats.hoursSpent}</p>
                    <p className="text-sm text-muted-foreground">Hours Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
                <CardDescription>Your progress in all courses</CardDescription>
              </CardHeader>
              <CardContent>
                {courseProgress.length > 0 ? (
                  <div className="space-y-4">
                    {courseProgress.map((course) => {
                      const progress = course.user_progress?.[0]?.progress_percentage || 0

                      return (
                        <div key={course.course_id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{course.courses.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {progress === 100 ? "Completed" : `${progress}% complete`}
                            </p>
                          </div>
                          <div className="w-32">
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">You haven't enrolled in any courses yet</p>
                    <Button className="mt-4" asChild>
                      <Link href="/courses">Browse Courses</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {profile.role === "admin" && (
              <Card>
                <CardHeader>
                  <CardTitle>Administrative Actions</CardTitle>
                  <CardDescription>Manage courses and users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" asChild>
                    <Link href="/admin/courses">Manage Courses</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/admin/users">Manage Users</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

