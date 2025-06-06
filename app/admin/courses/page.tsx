import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import MainLayout from "@/components/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { getAllCourses } from "@/lib/db"

async function getCourses() {
  const courses = await getAllCourses()

  return courses.map((course) => ({
    ...course,
    instructorName: course.instructor?.name || "No instructor",
    tags: course.tags?.join(", ") || "",
  }))
}

export default async function AdminCoursesPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard")
  }

  const courses = await getCourses()

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Courses</h1>
            <p className="text-muted-foreground">Create, edit and manage courses</p>
          </div>

          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Courses</CardTitle>
            <CardDescription>A list of all courses in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={courses} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

