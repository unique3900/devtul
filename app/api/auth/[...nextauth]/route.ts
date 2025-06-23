// Simple demo auth endpoint
export async function POST(request: Request) {
  const body = await request.json()

  if (body.email && body.password) {
    return Response.json({
      user: {
        id: "1",
        name: "Demo User",
        email: body.email,
        image: "/placeholder.svg?height=40&width=40",
      },
    })
  }

  return Response.json({ error: "Invalid credentials" }, { status: 401 })
}

export async function GET() {
  return Response.json({ message: "Auth endpoint" })
}
