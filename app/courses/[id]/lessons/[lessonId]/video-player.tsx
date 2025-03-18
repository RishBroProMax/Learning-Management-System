"use client"

import { useState, useEffect, useRef } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import YouTube from "react-youtube"

interface VideoPlayerProps {
  videoUrl: string
  lessonId: number
  userId: string
  completed: boolean
}

export default function VideoPlayer({ videoUrl, lessonId, userId, completed }: VideoPlayerProps) {
  const [player, setPlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [watchedSeconds, setWatchedSeconds] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const videoId = getYouTubeId(videoUrl)

  useEffect(() => {
    // Load saved progress
    const loadProgress = async () => {
      try {
        const supabase = createClientSupabaseClient()

        const { data, error } = await supabase
          .from("lesson_progress")
          .select("watched_seconds")
          .eq("lesson_id", lessonId)
          .eq("user_id", userId)
          .single()

        if (error && error.code !== "PGRST116") {
          console.error("Error loading progress:", error)
          return
        }

        if (data) {
          setWatchedSeconds(data.watched_seconds || 0)
        }
      } catch (error) {
        console.error("Error loading progress:", error)
      }
    }

    loadProgress()

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [lessonId, userId])

  const saveProgress = async (seconds: number, isCompleted = false) => {
    try {
      const supabase = createClientSupabaseClient()

      const { data, error } = await supabase
        .from("lesson_progress")
        .upsert({
          lesson_id: lessonId,
          user_id: userId,
          watched_seconds: seconds,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .select()

      if (error) {
        console.error("Error saving progress:", error)
        return
      }

      // Update course progress
      if (isCompleted) {
        // Get all lessons for this course
        const { data: courseData, error: courseError } = await supabase
          .from("lessons")
          .select("course_id")
          .eq("id", lessonId)
          .single()

        if (courseError) {
          console.error("Error getting course ID:", courseError)
          return
        }

        const courseId = courseData.course_id

        // Get all lessons for this course
        const { data: lessons, error: lessonsError } = await supabase
          .from("lessons")
          .select("id")
          .eq("course_id", courseId)

        if (lessonsError) {
          console.error("Error getting lessons:", lessonsError)
          return
        }

        // Get completed lessons
        const { data: completedLessons, error: completedError } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("completed", true)
          .in(
            "lesson_id",
            lessons.map((l) => l.id),
          )

        if (completedError) {
          console.error("Error getting completed lessons:", completedError)
          return
        }

        // Calculate progress percentage
        const progressPercentage = Math.round((completedLessons.length / lessons.length) * 100)

        // Update course progress
        const { error: progressError } = await supabase.from("user_progress").upsert({
          user_id: userId,
          course_id: courseId,
          progress_percentage: progressPercentage,
          completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
        })

        if (progressError) {
          console.error("Error updating course progress:", progressError)
          return
        }

        toast({
          title: "Lesson completed!",
          description: "Your progress has been saved",
        })

        // Refresh the page to update UI
        router.refresh()
      }
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  const onReady = (event: any) => {
    setPlayer(event.target)
    setDuration(event.target.getDuration())

    // If there's saved progress, seek to that position
    if (watchedSeconds > 0 && watchedSeconds < event.target.getDuration() - 10) {
      event.target.seekTo(watchedSeconds)
    }
  }

  const onStateChange = (event: any) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 1) {
      setIsPlaying(true)

      // Start tracking progress
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }

      progressInterval.current = setInterval(() => {
        if (player) {
          const currentTime = player.getCurrentTime()
          setWatchedSeconds(currentTime)

          // Calculate progress percentage
          const progressPercentage = Math.round((currentTime / player.getDuration()) * 100)
          setProgress(progressPercentage)

          // Save progress every 10 seconds
          if (Math.floor(currentTime) % 10 === 0) {
            saveProgress(currentTime)
          }

          // Mark as completed if watched more than 90%
          if (progressPercentage >= 90 && !completed) {
            saveProgress(currentTime, true)
          }
        }
      }, 1000)
    } else if (event.data === 2) {
      setIsPlaying(false)

      // Pause tracking
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
        progressInterval.current = null
      }

      // Save progress when paused
      if (player) {
        saveProgress(player.getCurrentTime())
      }
    } else if (event.data === 0) {
      // Video ended
      setIsPlaying(false)

      if (progressInterval.current) {
        clearInterval(progressInterval.current)
        progressInterval.current = null
      }

      // Mark as completed
      if (!completed) {
        saveProgress(player.getDuration(), true)
      }
    }
  }

  return (
    <div className="aspect-video w-full bg-black">
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={{
            height: "100%",
            width: "100%",
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
          className="h-full w-full"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-white">Video not available</p>
        </div>
      )}
    </div>
  )
}

