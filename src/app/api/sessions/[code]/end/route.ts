import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sessionRoom.status === "ENDED") {
      return NextResponse.json({ error: "Quiz already ended" }, { status: 400 });
    }

    const updated = await prisma.sessionRoom.update({
      where: { code },
      data: { status: "ENDED", endedAt: new Date() },
    });

    try {
      await pusher.trigger(PUSHER_CHANNELS.room(code), PUSHER_EVENTS.QUIZ_ENDED, {
        message: "Quiz ended!",
      });
    } catch (pusherErr) {
      console.error("Pusher trigger failed (non-fatal):", pusherErr);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("End session failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}