import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Pusher from "pusher";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { socket_id: socketId, channel_name: channelName } = body;

    if (!channelName.startsWith("teacher-") && !channelName.startsWith("room-") && !channelName.startsWith("presence-room-")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });

    const authResponse = pusher.authenticateUser(socketId, {
      id: session.user.id,
      user_id: session.user.id,
    });

    return new Response(JSON.stringify(authResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}