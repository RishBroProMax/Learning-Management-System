import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  id: string
  email: string
  name?: string
  username: string
  fullName?: string
  avatarUrl?: string
  bio?: string
  role: "student" | "admin" | "instructor"
  createdAt: Date
  updatedAt: Date
}

export interface Course {
  _id?: ObjectId
  id: string
  title: string
  description?: string
  imageUrl?: string
  difficultyLevel?: string
  durationMinutes: number
  instructorId?: string
  instructor?: {
    id: string
    name: string
    avatarUrl?: string
  }
  tags?: string[]
  createdAt: Date
  updatedAt: Date
  published: boolean
}

export interface Lesson {
  _id?: ObjectId
  id: string
  courseId: string
  title: string
  description?: string
  videoUrl?: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface Quiz {
  _id?: ObjectId
  id: string
  lessonId: string
  title: string
  description?: string
  passingScore: number
  createdAt: Date
  updatedAt: Date
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  quizId: string
  question: string
  questionType: string
  position: number
  points: number
  options: QuizOption[]
}

export interface QuizOption {
  id: string
  questionId: string
  optionText: string
  isCorrect: boolean
  position: number
}

export interface UserProgress {
  _id?: ObjectId
  id: string
  userId: string
  courseId: string
  progressPercentage: number
  startedAt: Date
  completedAt?: Date
}

export interface LessonProgress {
  _id?: ObjectId
  id: string
  userId: string
  lessonId: string
  completed: boolean
  watchedSeconds: number
  completedAt?: Date
}

export interface QuizAttempt {
  _id?: ObjectId
  id: string
  userId: string
  quizId: string
  score: number
  passed: boolean
  startedAt: Date
  completedAt?: Date
  responses: QuizResponse[]
}

export interface QuizResponse {
  id: string
  attemptId: string
  questionId: string
  selectedOptionId?: string
  textResponse?: string
  isCorrect: boolean
}

export interface CourseEnrollment {
  _id?: ObjectId
  id: string
  userId: string
  courseId: string
  enrolledAt: Date
}

