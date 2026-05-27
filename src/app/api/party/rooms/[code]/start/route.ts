import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { hostToken } = await request.json();

    if (!hostToken) {
      return NextResponse.json({ error: "Host token required" }, { status: 400 });
    }

    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
      include: { quiz: { select: { timeLimit: true } } },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.mode !== "PARTY") {
      return NextResponse.json({ error: "Not a party room" }, { status: 400 });
    }

    if (sessionRoom.hostToken !== hostToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sessionRoom.status !== "LOBBY") {
      return NextResponse.json({ error: "Game already started" }, { status: 400 });
    }

    const now = new Date();
    const timeLimit = sessionRoom.quiz.timeLimit;
    // forcedEndAt: quiz duration + 60s grace for stragglers
    const forcedEndAt = new Date(now.getTime() + timeLimit * 60 * 1000 + 60 * 1000);

    const updated = await prisma.sessionRoom.update({
      where: { code },
      data: { status: "ACTIVE", startedAt: now, forcedEndAt },
    });

    try {
      await pusher.trigger(PUSHER_CHANNELS.room(code), PUSHER_EVENTS.QUIZ_STARTED, {
        message: "Game starting!",
      });
    } catch (pusherErr) {
      console.error("Pusher trigger failed (non-fatal):", pusherErr);
    }

    return NextResponse.json({ startedAt: updated.startedAt });
  } catch (err) {
    console.error("Start party room failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
