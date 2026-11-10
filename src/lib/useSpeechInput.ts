"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Speech-to-text via the browser's Web Speech API (Chrome, Edge, Safari,
// Android). No server cost. The transcript is appended to whatever the player
// has already typed and stays editable. Firefox lacks the API, so `supported`
// is false there and the mic button hides.

interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SRErrorEvent {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRCtor = new () => SpeechRecognitionLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser to speak.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser to speak.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs an internet connection.",
};

export function useSpeechInput(opts: { value: string; onChange: (v: string) => void; maxChars: number }) {
  const { value, onChange, maxChars } = opts;
  const supported = useSyncExternalStore(noopSubscribe, () => getCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const finalRef = useRef("");
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => () => recRef.current?.abort(), []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value.trim() ? `${value.trimEnd()} ` : "";
    finalRef.current = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      const spoken = (finalRef.current + interim).replace(/\s+/g, " ").trimStart();
      const next = (baseRef.current + spoken).slice(0, maxChars);
      onChangeRef.current(next);
      if (baseRef.current.length + spoken.length >= maxChars) rec.stop();
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") setError(ERRORS[e.error] ?? "Couldn't hear that. Try again.");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setError("Couldn't start the microphone.");
    }
  }, [value, maxChars]);

  return { supported, listening, error, start, stop, toggle: listening ? stop : start };
}
