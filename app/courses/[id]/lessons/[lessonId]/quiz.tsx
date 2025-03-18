"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

interface QuizOption {
  id: number
  option_text: string
  is_correct: boolean
  position: number
}

interface QuizQuestion {
  id: number
  question: string
  question_type: string
  position: number
  points: number
  options: QuizOption[]
}

interface Quiz {
  id: number
  title: string
  description: string | null
  passing_score: number
  questions: QuizQuestion[]
}

interface QuizAttempt {
  id: number
  score: number | null
  passed: boolean | null
  started_at: string
  completed_at: string | null
}

interface QuizComponentProps {
  quiz: Quiz
  userId: string
  attempts: QuizAttempt[]
}

export default function QuizComponent({ quiz, userId, attempts }: QuizComponentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizResults, setQuizResults] = useState<{
    score: number
    totalPoints: number
    passed: boolean
    correctAnswers: number
    totalQuestions: number
  } | null>(null)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const sortedQuestions = [...quiz.questions].sort((a, b) => a.position - b.position)
  const currentQuestion = sortedQuestions[currentQuestionIndex]
  const sortedOptions = currentQuestion ? [...currentQuestion.options].sort((a, b) => a.position - b.position) : []

  const handleOptionSelect = (optionId: number) => {
    setSelectedOptions({
      ...selectedOptions,
      [currentQuestion.id]: optionId,
    })
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < sortedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const startQuiz = async () => {
    try {
      const supabase = createClientSupabaseClient()

      // Create a new quiz attempt
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: userId,
          quiz_id: quiz.id,
          started_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error("Error starting quiz:", error)
        toast({
          title: "Error",
          description: "Failed to start quiz",
          variant: "destructive",
        })
        return
      }

      setAttemptId(data[0].id)
    } catch (error) {
      console.error("Error starting quiz:", error)
      toast({
        title: "Error",
        description: "Failed to start quiz",
        variant: "destructive",
      })
    }
  }

  const submitQuiz = async () => {
    if (!attemptId) return

    setIsSubmitting(true)

    try {
      const supabase = createClientSupabaseClient()

      // Calculate score
      let correctAnswers = 0
      let totalPoints = 0

      // Submit responses for each question
      for (const question of sortedQuestions) {
        const selectedOptionId = selectedOptions[question.id]

        if (!selectedOptionId) continue

        const selectedOption = question.options.find((o) => o.id === selectedOptionId)
        const isCorrect = selectedOption?.is_correct || false

        if (isCorrect) {
          correctAnswers++
          totalPoints += question.points || 1
        }

        // Save response
        const { error: responseError } = await supabase.from("quiz_responses").insert({
          attempt_id: attemptId,
          question_id: question.id,
          selected_option_id: selectedOptionId,
          is_correct: isCorrect,
        })

        if (responseError) {
          console.error("Error saving response:", responseError)
        }
      }

      // Calculate percentage score
      const totalQuestionPoints = sortedQuestions.reduce((sum, q) => sum + (q.points || 1), 0)
      const scorePercentage = Math.round((totalPoints / totalQuestionPoints) * 100)
      const passed = scorePercentage >= (quiz.passing_score || 70)

      // Update attempt with score
      const { error: attemptError } = await supabase
        .from("quiz_attempts")
        .update({
          score: scorePercentage,
          passed: passed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptId)

      if (attemptError) {
        console.error("Error updating attempt:", attemptError)
      }

      // If passed, mark lesson as completed
      if (passed) {
        // Get lesson ID from quiz
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("lesson_id")
          .eq("id", quiz.id)
          .single()

        if (quizError) {
          console.error("Error getting lesson ID:", quizError)
        } else {
          // Mark lesson as completed
          const { error: progressError } = await supabase.from("lesson_progress").upsert({
            lesson_id: quizData.lesson_id,
            user_id: userId,
            completed: true,
            completed_at: new Date().toISOString(),
          })

          if (progressError) {
            console.error("Error marking lesson as completed:", progressError)
          }

          // Update course progress
          // Get course ID from lesson
          const { data: lessonData, error: lessonError } = await supabase
            .from("lessons")
            .select("course_id")
            .eq("id", quizData.lesson_id)
            .single()

          if (lessonError) {
            console.error("Error getting course ID:", lessonError)
          } else {
            const courseId = lessonData.course_id

            // Get all lessons for this course
            const { data: lessons, error: lessonsError } = await supabase
              .from("lessons")
              .select("id")
              .eq("course_id", courseId)

            if (lessonsError) {
              console.error("Error getting lessons:", lessonsError)
            } else {
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
              } else {
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
                }
              }
            }
          }
        }
      }

      setQuizResults({
        score: scorePercentage,
        totalPoints,
        passed,
        correctAnswers,
        totalQuestions: sortedQuestions.length,
      })

      setQuizCompleted(true)

      toast({
        title: passed ? "Quiz Passed!" : "Quiz Completed",
        description: passed
          ? "Congratulations! You've passed the quiz."
          : "You didn't pass this time. Review the material and try again.",
        variant: passed ? "default" : "destructive",
      })

      // Refresh the page to update UI
      router.refresh()
    } catch (error) {
      console.error("Error submitting quiz:", error)
      toast({
        title: "Error",
        description: "Failed to submit quiz",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show previous attempts if any
  if (attempts.length > 0 && !attemptId && !quizCompleted) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Previous Attempts</h2>
          <p className="text-muted-foreground">
            You have attempted this quiz {attempts.length} time{attempts.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <div className="space-y-4">
          {attempts.map((attempt) => (
            <Card key={attempt.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Attempt on {new Date(attempt.started_at).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">Score: {attempt.score}%</p>
                  </div>
                  <div className="flex items-center">
                    {attempt.passed ? (
                      <div className="flex items-center text-green-500">
                        <CheckCircle className="mr-1 h-5 w-5" />
                        <span>Passed</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-500">
                        <XCircle className="mr-1 h-5 w-5" />
                        <span>Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={startQuiz}>Start New Attempt</Button>
      </div>
    )
  }

  // Show quiz results
  if (quizCompleted && quizResults) {
    return (
      <div className="space-y-6">
        <Alert variant={quizResults.passed ? "default" : "destructive"}>
          <AlertTitle>{quizResults.passed ? "Quiz Passed!" : "Quiz Not Passed"}</AlertTitle>
          <AlertDescription>
            You scored {quizResults.score}%.{" "}
            {quizResults.passed ? "Congratulations on passing the quiz!" : "Review the material and try again."}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p>
            You answered {quizResults.correctAnswers} out of {quizResults.totalQuestions} questions correctly.
          </p>
          <p>Passing score: {quiz.passing_score || 70}%</p>
        </div>

        <Button
          onClick={() => {
            setQuizCompleted(false)
            setAttemptId(null)
            setSelectedOptions({})
            setCurrentQuestionIndex(0)
          }}
        >
          Try Again
        </Button>
      </div>
    )
  }

  // Show quiz questions
  return (
    <div className="space-y-6">
      {!attemptId ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{quiz.title}</h2>
            {quiz.description && <p className="text-muted-foreground">{quiz.description}</p>}
          </div>

          <div className="space-y-2">
            <p>This quiz has {sortedQuestions.length} questions.</p>
            <p>Passing score: {quiz.passing_score || 70}%</p>
          </div>

          <Button onClick={startQuiz}>Start Quiz</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Question {currentQuestionIndex + 1} of {sortedQuestions.length}
            </h2>
            <p className="text-sm text-muted-foreground">
              {Object.keys(selectedOptions).length} of {sortedQuestions.length} answered
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-lg font-medium">{currentQuestion.question}</p>

            <RadioGroup
              value={selectedOptions[currentQuestion.id]?.toString()}
              onValueChange={(value) => handleOptionSelect(Number.parseInt(value))}
            >
              <div className="space-y-2">
                {sortedOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                    <Label htmlFor={`option-${option.id}`}>{option.option_text}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>

            {currentQuestionIndex < sortedQuestions.length - 1 ? (
              <Button onClick={handleNextQuestion} disabled={!selectedOptions[currentQuestion.id]}>
                Next
              </Button>
            ) : (
              <Button
                onClick={submitQuiz}
                disabled={isSubmitting || Object.keys(selectedOptions).length !== sortedQuestions.length}
              >
                {isSubmitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

