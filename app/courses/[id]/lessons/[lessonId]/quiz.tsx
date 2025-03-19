"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"
import { generateId } from "@/lib/db"

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
      const response = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          startedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start quiz")
      }

      const data = await response.json()
      setAttemptId(data.attempt.id)
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
      // Calculate score
      let correctAnswers = 0
      let totalPoints = 0
      const responses = []

      // Prepare responses for each question
      for (const question of sortedQuestions) {
        const selectedOptionId = selectedOptions[question.id]

        if (!selectedOptionId) continue

        const selectedOption = question.options.find((o) => o.id === selectedOptionId)
        const isCorrect = selectedOption?.is_correct || false

        if (isCorrect) {
          correctAnswers++
          totalPoints += question.points || 1
        }

        responses.push({
          id: generateId(),
          questionId: question.id,
          selectedOptionId,
          isCorrect,
        })
      }

      // Calculate percentage score
      const totalQuestionPoints = sortedQuestions.reduce((sum, q) => sum + (q.points || 1), 0)
      const scorePercentage = Math.round((totalPoints / totalQuestionPoints) * 100)
      const passed = scorePercentage >= (quiz.passing_score || 70)

      // Submit the quiz
      const response = await fetch(`/api/quizzes/${quiz.id}/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          responses,
          score: scorePercentage,
          passed,
          completedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit quiz")
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

