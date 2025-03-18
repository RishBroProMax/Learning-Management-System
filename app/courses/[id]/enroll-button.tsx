"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface EnrollButtonProps {
  courseId: number
  userId: string
}

export default function EnrollButton({ courseId, userId }: EnrollButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleEnroll = async () => {
    setIsLoading(true)

    try {
      const supabase = createClientSupabaseClient()

      // Create enrollment
      const { error: enrollmentError } = await supabase.from("course_enrollments").insert({
        user_id: userId,
        course_id: courseId,
      })

      if (enrollmentError) {
        throw new Error(enrollmentError.message)
      }

      // Create initial progress record
      const { error: progressError } = await supabase.from("user_progress").insert({
        user_id: userId,
        course_id: courseId,
        progress_percentage: 0,
      })

      if (progressError) {
        throw new Error(progressError.message)
      }

      toast({
        title: "Enrolled successfully",
        description: "You have been enrolled in this course",
      })

      // Refresh the page to show enrolled state
      router.refresh()
    } catch (error) {
      console.error("Error enrolling:", error)
      toast({
        title: "Enrollment failed",
        description: "There was an error enrolling in this course",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleEnroll} disabled={isLoading}>
      {isLoading ? "Enrolling..." : "Enroll in Course"}
    </Button>
  )
}

