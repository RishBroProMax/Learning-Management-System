export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: number
          title: string
          description: string | null
          image_url: string | null
          difficulty_level: string | null
          duration_minutes: number
          instructor_id: string | null
          created_at: string
          updated_at: string
          published: boolean
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          image_url?: string | null
          difficulty_level?: string | null
          duration_minutes: number
          instructor_id?: string | null
          created_at?: string
          updated_at?: string
          published?: boolean
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          image_url?: string | null
          difficulty_level?: string | null
          duration_minutes?: number
          instructor_id?: string | null
          created_at?: string
          updated_at?: string
          published?: boolean
        }
      }
      tags: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      course_tags: {
        Row: {
          course_id: number
          tag_id: number
        }
        Insert: {
          course_id: number
          tag_id: number
        }
        Update: {
          course_id?: number
          tag_id?: number
        }
      }
      lessons: {
        Row: {
          id: number
          course_id: number
          title: string
          description: string | null
          video_url: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          course_id: number
          title: string
          description?: string | null
          video_url?: string | null
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          course_id?: number
          title?: string
          description?: string | null
          video_url?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: number
          lesson_id: number
          title: string
          description: string | null
          passing_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          lesson_id: number
          title: string
          description?: string | null
          passing_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          lesson_id?: number
          title?: string
          description?: string | null
          passing_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: number
          quiz_id: number
          question: string
          question_type: string
          position: number
          points: number | null
        }
        Insert: {
          id?: number
          quiz_id: number
          question: string
          question_type?: string
          position: number
          points?: number | null
        }
        Update: {
          id?: number
          quiz_id?: number
          question?: string
          question_type?: string
          position?: number
          points?: number | null
        }
      }
      quiz_options: {
        Row: {
          id: number
          question_id: number
          option_text: string
          is_correct: boolean | null
          position: number
        }
        Insert: {
          id?: number
          question_id: number
          option_text: string
          is_correct?: boolean | null
          position: number
        }
        Update: {
          id?: number
          question_id?: number
          option_text?: string
          is_correct?: boolean | null
          position?: number
        }
      }
      user_progress: {
        Row: {
          id: number
          user_id: string
          course_id: number
          progress_percentage: number | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          course_id: number
          progress_percentage?: number | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          course_id?: number
          progress_percentage?: number | null
          started_at?: string
          completed_at?: string | null
        }
      }
      lesson_progress: {
        Row: {
          id: number
          user_id: string
          lesson_id: number
          completed: boolean | null
          watched_seconds: number | null
          completed_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          lesson_id: number
          completed?: boolean | null
          watched_seconds?: number | null
          completed_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          lesson_id?: number
          completed?: boolean | null
          watched_seconds?: number | null
          completed_at?: string | null
        }
      }
      quiz_attempts: {
        Row: {
          id: number
          user_id: string
          quiz_id: number
          score: number | null
          passed: boolean | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          quiz_id: number
          score?: number | null
          passed?: boolean | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          quiz_id?: number
          score?: number | null
          passed?: boolean | null
          started_at?: string
          completed_at?: string | null
        }
      }
      quiz_responses: {
        Row: {
          id: number
          attempt_id: number
          question_id: number
          selected_option_id: number | null
          text_response: string | null
          is_correct: boolean | null
        }
        Insert: {
          id?: number
          attempt_id: number
          question_id: number
          selected_option_id?: number | null
          text_response?: string | null
          is_correct?: boolean | null
        }
        Update: {
          id?: number
          attempt_id?: number
          question_id?: number
          selected_option_id?: number | null
          text_response?: string | null
          is_correct?: boolean | null
        }
      }
      course_enrollments: {
        Row: {
          id: number
          user_id: string
          course_id: number
          enrolled_at: string
        }
        Insert: {
          id?: number
          user_id: string
          course_id: number
          enrolled_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          course_id?: number
          enrolled_at?: string
        }
      }
    }
  }
}

