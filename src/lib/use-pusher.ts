"use client";

import Pusher from "pusher-js";
import { useEffect, useRef } from "react";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

const isPusherConfigured =
  !!PUSHER_KEY &&
  !PUSHER_KEY.startsWith("your-") &&
  !!PUSHER_CLUSTER &&
  !PUSHER_CLUSTER.startsWith("your-");

export function usePusher() {
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!isPusherConfigured) return;

    const pusher = new Pusher(PUSHER_KEY!, {
      cluster: PUSHER_CLUSTER!,
    });
    pusherRef.current = pusher;

    return () => {
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, []);

  return { pusher: pusherRef.current, isConfigured: isPusherConfigured };
}

export { isPusherConfigured };