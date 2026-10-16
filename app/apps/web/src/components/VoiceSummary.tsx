"use client";
import { useEffect, useRef, useState } from "react";
import { Headphones, Volume2 } from "lucide-react";
import { ApiError, apiRaw } from "@/lib/api";
import { Button, Card, useApi } from "./ui";

/** Weekly spoken summary. Audio is fetched only on tap (TTS costs money); 503 = no key → text only. */
export function VoiceSummary() {
  const text = useApi<{ text: string }>("/voice/weekly/text");
  const [audio, setAudio] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unavailable" | "error">("idle");
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);

  async function play() {
    if (audio) return ref.current?.play();
    setState("loading");
    try {
      const blob = await (await apiRaw("/voice/weekly")).blob();
      setAudio(URL.createObjectURL(blob));
      setState("idle");
    } catch (e) {
      setState(e instanceof ApiError && e.status === 503 ? "unavailable" : "error");
    }
  }

  if (text.error && text.status !== 503) return null;
  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Headphones aria-hidden size={20} className="text-primary" /> สรุปสัปดาห์นี้</h2>
      {text.data && <p className="text-muted">{text.data.text}</p>}
      {state === "unavailable" || text.status === 503 ? (
        <p className="mt-3 text-sm text-muted">เสียงสรุปยังไม่เปิดใช้งาน อ่านข้อความด้านบนแทนได้เลย</p>
      ) : (
        <>
          {!audio && (
            <Button onClick={play} disabled={state === "loading"} className="mt-4">
              <Volume2 aria-hidden size={20} /> {state === "loading" ? "กำลังสร้างเสียง…" : "ฟังสรุป 30 วินาที"}
            </Button>
          )}
          {audio && <audio ref={ref} src={audio} controls autoPlay className="mt-4 w-full" aria-label="เสียงสรุปสัปดาห์นี้" />}
          {state === "error" && <p role="alert" className="mt-2 text-sm text-danger">เล่นเสียงไม่ได้ ลองใหม่อีกครั้ง</p>}
        </>
      )}
    </Card>
  );
}
