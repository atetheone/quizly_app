import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { joinRoomSchema } from "@/lib/validations";
import { pusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const result = joinRoomSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.status !== "LOBBY") {
      return NextResponse.json(
        { error: "Room is not accepting new students" },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        name: result.data.name,
        sessionId: sessionRoom.id,
      },
    });

    try {
      await pusher.trigger(PUSHER_CHANNELS.room(code), PUSHER_EVENTS.STUDENT_JOINED, {
        studentId: student.id,
        name: student.name,
      });
    } catch (pusherErr) {
      console.error("Pusher trigger failed (non-fatal):", pusherErr);
    }

    return NextResponse.json({
      studentId: student.id,
      name: student.name,
      sessionCode: code,
    }, { status: 201 });
  } catch (err) {
    console.error("Join session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}