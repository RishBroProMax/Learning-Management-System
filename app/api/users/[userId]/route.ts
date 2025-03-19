import { type NextRequest, NextResponse } from "next/server"
import { updateUser } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    const data = await request.json()
    
    const user = await updateUser(userId, {
      username: data.username,
      fullName: data.fullName,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      updatedAt: new Date()
    })
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatarUrl: user.avatarUrl
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },\
      { status:   error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

