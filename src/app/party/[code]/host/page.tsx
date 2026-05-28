"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Pusher from "pusher-js";
import QRCode from "qrcode";
import { isPusherConfigured } from "@/lib/use-pusher";
import { QLogo, QAvatar } from "@/components/q-ui";
import { useTranslations } from "next-intl";

type SessionInfo = { code: string; status: string; quizTitle: string; hostName: string | null };

export default function PartyHostPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const t = useTranslations("party");

  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem(`party_host_token_${code}`);
    if (!token) {
      router.replace(`/join/${code}`);
      return;
    }

    fetch(`/api/sessions/${code}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error || data.mode !== "PARTY") {
          router.replace("/party");
          return;
        }
        setInfo(data);

        // Generate QR code
        const joinUrl = `${window.location.origin}/join/${code}`;
        QRCode.toDataURL(joinUrl, { width: 160 }, (err, url) => {
          if (!err) setQrCodeUrl(url);
        });

        // Auto-join the host as a player if not already joined for this session
        const existingStudentId = sessionStorage.getItem("studentId");
        const existingSessionCode = sessionStorage.getItem("sessionCode");
        if (existingStudentId && existingSessionCode === code) return;

        const hostName = sessionStorage.getItem(`party_host_name_${code}`) || data.hostName || "Host";
        const joinRes = await fetch(`/api/sessions/${code}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: hostName }),
        });
        if (joinRes.ok) {
          const joinData = await joinRes.json();
          sessionStorage.setItem("studentId", joinData.studentId);
          sessionStorage.setItem("studentName", joinData.name);
          sessionStorage.setItem("sessionCode", code);
        }
      });
  }, [code, router]);

  useEffect(() => {
    if (!info || !isPusherConfigured) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const ch = pusher.subscribe(`room-${code}`);
    ch.bind("student-joined", (d: { name: string }) => {
      setPlayers((prev) => [...prev, d.name]);
    });
    return () => {
      pusher.unsubscribe(`room-${code}`);
      pusher.disconnect();
    };
  }, [code, info]);

  async function handleStart() {
    setStarting(true);
    setError("");
    const token = sessionStorage.getItem(`party_host_token_${code}`) ?? "";
    const res = await fetch(`/api/party/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostToken: token }),
    });
    if (res.ok) {
      router.push(`/play/${code}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to start");
      setStarting(false);
    }
  }

  if (!info) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--q-bg)" }}>
        <span style={{ fontFamily: "var(--q-display)", fontSize: 22, color: "var(--q-ink-3)" }}>Loading…</span>
      </div>
    );
  }

  const hostName = sessionStorage.getItem(`party_host_name_${code}`) || info.hostName || "Host";
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;
  const allPlayers = [hostName, ...players];

  return (
    <div className="q-party-host-split" style={{ display: "flex", height: "100vh", background: "var(--q-bg)" }}>
      {/* Left: code + QR */}
      <div
        className="q-party-host-left"
        style={{
          flex: "1.4 1 0",
          background: "var(--q-ink)",
          color: "var(--q-bg)",
          display: "flex",
          flexDirection: "column",
          padding: 40,
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -120, right: -120, width: 340, height: 340, opacity: 0.12 }} className="q-spike" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <QLogo size={28} />
          <span className="q-chip q-chip-yellow" style={{ fontSize: 11, color: "var(--q-ink)" }}>PARTY</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative", textAlign: "center" }}>
          <div className="q-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>
            {t("shareCode")}
          </div>
          <div
            style={{
              fontFamily: "var(--q-display)",
              fontWeight: 700,
              fontSize: "clamp(72px, 12vw, 140px)",
              lineHeight: 0.9,
              letterSpacing: "0.04em",
            }}
          >
            <span
              style={{
                background: "var(--q-yellow)",
                color: "var(--q-ink)",
                padding: "0 14px",
                borderRadius: 16,
                border: "3px solid var(--q-yellow)",
              }}
            >
              {code}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR" style={{ width: 90, height: 90, borderRadius: 10, border: "2px solid rgba(255,255,255,0.2)" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
              <span style={{ fontFamily: "var(--q-mono)", fontSize: 13 }}>{joinUrl}</span>
              <button
                className="q-btn q-btn-sm q-btn-yellow"
                onClick={() => navigator.clipboard?.writeText(joinUrl)}
                style={{ alignSelf: "flex-start" }}
              >
                📋 Copy link
              </button>
            </div>
          </div>
        </div>

        <div style={{ fontFamily: "var(--q-sans)", fontSize: 14, color: "rgba(255,255,255,0.5)", position: "relative" }}>
          {info.quizTitle}
        </div>
      </div>

      {/* Right: player roster + start button */}
      <div className="q-party-host-right" style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="q-eyebrow">{t("playersCount", { count: allPlayers.length })}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {allPlayers.map((name, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--q-bg-2)",
                borderRadius: 10,
              }}
            >
              <QAvatar name={name} size={28} />
              <span style={{ fontWeight: 500, fontSize: 14, fontFamily: "var(--q-sans)", flex: 1 }}>{name}</span>
              {i === 0 && (
                <span className="q-chip q-chip-yellow" style={{ fontSize: 10, color: "var(--q-ink)" }}>
                  {t("youHost")}
                </span>
              )}
            </div>
          ))}

          {allPlayers.length === 1 && (
            <p style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)", marginTop: 8 }}>
              {t("waitingForPlayers")}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" style={{ background: "var(--q-coral-soft)", border: "1.5px solid var(--q-coral)", borderRadius: "var(--q-r-sm)", padding: "10px 14px", fontSize: 14, fontFamily: "var(--q-sans)" }}>
            {error}
          </div>
        )}

        <button
          className="q-btn q-btn-coral q-btn-lg"
          onClick={handleStart}
          disabled={starting || allPlayers.length < 1}
          style={{ width: "100%" }}
        >
          {starting ? t("starting") : t("startGame")}
        </button>
      </div>
    </div>
  );
}
