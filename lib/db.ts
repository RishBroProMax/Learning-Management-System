import clientPromise from "./mongodb"
import { nanoid } from "nanoid"
import type { User, Course, Lesson, Quiz, UserProgress, LessonProgress, QuizAttempt, CourseEnrollment } from "./models"

// Helper function to generate unique IDs
export function generateId(): string {
  return nanoid(12)
}

// Users
export async function getUserById(id: string): Promise<User | null> {
  const client = await clientPromise
  const collection = client.db().collection("users")
  return collection.findOne({ id }) as Promise<User | null>
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise
  const collection = client.db().collection("users")
  return collection.findOne({ email }) as Promise<User | null>
}

export async function createUser(user: Omit<User, "_id">): Promise<User> {
  const client = await clientPromise
  const collection = client.db().collection("users")
  const result = await collection.insertOne(user)
  return { ...user, _id: result.insertedId }
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const client = await clientPromise
  const collection = client.db().collection("users")

  const { _id, ...updateData } = data

  await collection.updateOne({ id }, { $set: { ...updateData, updatedAt: new Date() } })

  return getUserById(id)
}

export async function getAllUsers(): Promise<User[]> {
  const client = await clientPromise
  const collection = client.db().collection("users")
  return collection.find().sort({ createdAt: -1 }).toArray() as Promise<User[]>
}

// Courses
export async function getCourseById(id: string): Promise<Course | null> {
  const client = await clientPromise
  const collection = client.db().collection("courses")
  const course = (await collection.findOne({ id })) as Course | null

  if (course && course.instructorId) {
    const usersCollection = client.db().collection("users")
    const instructor = (await usersCollection.findOne({ id: course.instructorId })) as User | null

    if (instructor) {
      course.instructor = {
        id: instructor.id,
        name: instructor.fullName || instructor.username,
        avatarUrl: instructor.avatarUrl,
      }
    }
  }

  return course
}

export async function getAllCourses(publishedOnly = false): Promise<Course[]> {
  const client = await clientPromise
  const collection = client.db().collection("courses")

  const query = publishedOnly ? { published: true } : {}
  const courses = (await collection.find(query).sort({ createdAt: -1 }).toArray()) as Course[]

  // Get instructors for all courses
  const instructorIds = courses.filter((c) => c.instructorId).map((c) => c.instructorId) as string[]

  if (instructorIds.length > 0) {
    const usersCollection = client.db().collection("users")
    const instructors = (await usersCollection.find({ id: { $in: instructorIds } }).toArray()) as User[]

    // Map instructors to courses
    courses.forEach((course) => {
      if (course.instructorId) {
        const instructor = instructors.find((i) => i.id === course.instructorId)
        if (instructor) {
          course.instructor = {
            id: instructor.id,
            name: instructor.fullName || instructor.username,
            avatarUrl: instructor.avatarUrl,
          }
        }
      }
    })
  }

  return courses
}

export async function createCourse(course: Omit<Course, "_id">): Promise<Course> {
  const client = await clientPromise
  const collection = client.db().collection("courses")
  const result = await collection.insertOne(course)
  return { ...course, _id: result.insertedId }
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course | null> {
  const client = await clientPromise
  const collection = client.db().collection("courses")

  const { _id, ...updateData } = data

  await collection.updateOne({ id }, { $set: { ...updateData, updatedAt: new Date() } })

  return getCourseById(id)
}

// Lessons
export async function getLessonById(id: string): Promise<Lesson | null> {
  const client = await clientPromise
  const collection = client.db().collection("lessons")
  return collection.findOne({ id }) as Promise<Lesson | null>
}

export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const client = await clientPromise
  const collection = client.db().collection("lessons")
  return collection.find({ courseId }).sort({ position: 1 }).toArray() as Promise<Lesson[]>
}

// Enrollments
export async function getEnrollmentsByUserId(userId: string): Promise<CourseEnrollment[]> {
  const client = await clientPromise
  const collection = client.db().collection("enrollments")
  return collection.find({ userId }).sort({ enrolledAt: -1 }).toArray() as Promise<CourseEnrollment[]>
}

export async function createEnrollment(enrollment: Omit<CourseEnrollment, "_id">): Promise<CourseEnrollment> {
  const client = await clientPromise
  const collection = client.db().collection("enrollments")
  const result = await collection.insertOne(enrollment)
  return { ...enrollment, _id: result.insertedId }
}

export async function isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
  const client = await clientPromise
  const collection = client.db().collection("enrollments")
  const enrollment = await collection.findOne({ userId, courseId })
  return !!enrollment
}

// User Progress
export async function getUserProgress(userId: string, courseId: string): Promise<UserProgress | null> {
  const client = await clientPromise
  const collection = client.db().collection("userProgress")
  return collection.findOne({ userId, courseId }) as Promise<UserProgress | null>
}

export async function updateUserProgress(
  userId: string,
  courseId: string,
  data: Partial<UserProgress>,
): Promise<UserProgress | null> {
  const client = await clientPromise
  const collection = client.db().collection("userProgress")

  const existingProgress = await collection.findOne({ userId, courseId })

  if (existingProgress) {
    await collection.updateOne({ userId, courseId }, { $set: data })
  } else {
    const newProgress: UserProgress = {
      id: generateId(),
      userId,
      courseId,
      progressPercentage: 0,
      startedAt: new Date(),
      ...data,
    }
    await collection.insertOne(newProgress)
  }

  return getUserProgress(userId, courseId)
}

// Lesson Progress
export async function getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
  const client = await clientPromise
  const collection = client.db().collection("lessonProgress")
  return collection.findOne({ userId, lessonId }) as Promise<LessonProgress | null>
}

export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  data: Partial<LessonProgress>,
): Promise<LessonProgress | null> {
  const client = await clientPromise
  const collection = client.db().collection("lessonProgress")

  const existingProgress = await collection.findOne({ userId, lessonId })

  if (existingProgress) {
    await collection.updateOne({ userId, lessonId }, { $set: data })
  } else {
    const newProgress: LessonProgress = {
      id: generateId(),
      userId,
      lessonId,
      completed: false,
      watchedSeconds: 0,
      ...data,
    }
    await collection.insertOne(newProgress)
  }

  return getLessonProgress(userId, lessonId)
}

// Quiz Attempts
export async function createQuizAttempt(attempt: Omit<QuizAttempt, "_id">): Promise<QuizAttempt> {
  const client = await clientPromise
  const collection = client.db().collection("quizAttempts")
  const result = await collection.insertOne(attempt)
  return { ...attempt, _id: result.insertedId }
}

export async function updateQuizAttempt(id: string, data: Partial<QuizAttempt>): Promise<QuizAttempt | null> {
  const client = await clientPromise
  const collection = client.db().collection("quizAttempts")

  const { _id, ...updateData } = data

  await collection.updateOne({ id }, { $set: updateData })

  return collection.findOne({ id }) as Promise<QuizAttempt | null>
}

export async function getQuizAttemptsByUserAndQuiz(userId: string, quizId: string): Promise<QuizAttempt[]> {
  const client = await clientPromise
  const collection = client.db().collection("quizAttempts")
  return collection.find({ userId, quizId }).sort({ completedAt: -1 }).toArray() as Promise<QuizAttempt[]>
}

// Quizzes
export async function getQuizById(id: string): Promise<Quiz | null> {
  const client = await clientPromise
  const collection = client.db().collection("quizzes")
  return collection.findOne({ id }) as Promise<Quiz | null>
}

export async function getQuizByLessonId(lessonId: string): Promise<Quiz | null> {
  const client = await clientPromise
  const collection = client.db().collection("quizzes")
  return collection.findOne({ lessonId }) as Promise<Quiz | null>
}

