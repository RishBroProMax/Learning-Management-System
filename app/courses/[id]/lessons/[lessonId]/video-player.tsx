"use client"

import { useState, useEffect, useRef } from "react"
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
        const response = await fetch(`/api/lessons/${lessonId}/progress?userId=${userId}`)
        if (!response.ok) {
          throw new Error("Failed to load progress")
        }

        const data = await response.json()
        if (data.progress) {
          setWatchedSeconds(data.progress.watchedSeconds || 0)
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
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          watchedSeconds: seconds,
          completed: isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save progress")
      }

      // If completed, show toast and refresh the page
      if (isCompleted) {
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

