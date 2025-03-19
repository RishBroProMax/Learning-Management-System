import { NextResponse } from "next/server"
import { hash } from "bcrypt"
import { createUser, generateId, getUserByEmail } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, password, fullName, username } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const user = await createUser({
      id: generateId(),
      email,
      password: hashedPassword,
      username: username || email.split("@")[0],
      fullName: fullName || null,
      role: "student",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "An error occurred during registration" }, { status: 500 })
  }
}

