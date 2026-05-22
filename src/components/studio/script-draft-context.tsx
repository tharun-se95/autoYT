"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { generateScript } from "@/app/actions/script-writer";
import {
  formatScriptAsNarVis,
} from "@/lib/script-writer/format-tagged";
import type { ScriptDocument } from "@/lib/script-writer/types";

export const SCRIPT_DRAFT_UPDATED_EVENT = "upgrade-life:script-draft-updated";

export function scriptDraftStorageKey(videoId: string): string {
  return `upgrade-life:script-draft:${videoId}`;
}

function isScriptDocument(x: unknown): x is ScriptDocument {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.workingTitle !== "string" || !Array.isArray(o.acts)) return false;
  return o.acts.length > 0;
}

export function readScriptDraftFromStorage(videoId: string): {
  brief: string;
  script: ScriptDocument | null;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(scriptDraftStorageKey(videoId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const brief = typeof o.brief === "string" ? o.brief : "";
    const script = isScriptDocument(o.scriptJson) ? o.scriptJson : null;
    return { brief, script };
  } catch {
    return null;
  }
}

type ScriptDraftContextValue = {
  videoId: string;
  brief: string;
  setBrief: (v: string) => void;
  script: ScriptDocument | null;
  error: string | null;
  pending: boolean;
  showSeededBanner: boolean;
  dismissSeededBanner: () => void;
  resetSeedToBlank: () => void;
  generatedThisSession: boolean;
  submitGenerate: (e?: React.FormEvent) => void;
  copyTaggedTranscript: () => Promise<void>;
  copyDone: boolean;
};

const ScriptDraftContext = createContext<ScriptDraftContextValue | null>(null);

export function useScriptDraft(): ScriptDraftContextValue {
  const ctx = useContext(ScriptDraftContext);
  if (!ctx) {
    throw new Error("useScriptDraft must be used within ScriptDraftProvider");
  }
  return ctx;
}

export function useScriptDraftOptional(): ScriptDraftContextValue | null {
  return useContext(ScriptDraftContext);
}

function notifyDraftUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCRIPT_DRAFT_UPDATED_EVENT));
}

export function ScriptDraftProvider({
  videoId,
  defaultBrief,
  children,
}: {
  videoId: string;
  defaultBrief?: string;
  children: ReactNode;
}) {
  const [brief, setBriefState] = useState("");
  const [script, setScript] = useState<ScriptDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showSeededBanner, setShowSeededBanner] = useState(false);
  const [generatedThisSession, setGeneratedThisSession] = useState(false);
  const seededDefault = useRef(false);

  const persist = useCallback(
    (nextBrief: string, nextScript: ScriptDocument | null) => {
      if (!videoId) return;
      try {
        localStorage.setItem(
          scriptDraftStorageKey(videoId),
          JSON.stringify({
            brief: nextBrief,
            scriptJson: nextScript,
            updatedAt: new Date().toISOString(),
          })
        );
        notifyDraftUpdated();

        if (nextScript) {
          fetch("/api/studio/script/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId, script: nextScript }),
          }).catch((err) => console.error("Error syncing script draft to server:", err));
        }
      } catch {
        /* quota / private mode */
      }
    },
    [videoId]
  );

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;

    const applyDraft = (brief: string, scriptJson: ScriptDocument | null) => {
      if (cancelled) return;
      if (brief) setBriefState(brief);
      if (scriptJson) {
        setScript(scriptJson);
        setGeneratedThisSession(true);
      }
      seededDefault.current = true;
    };

    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(scriptDraftStorageKey(videoId));
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            const o = parsed as Record<string, unknown>;
            const brief = typeof o.brief === "string" ? o.brief : "";
            const scriptJson = isScriptDocument(o.scriptJson)
              ? o.scriptJson
              : null;
            if (scriptJson) {
              applyDraft(brief, scriptJson);
              return;
            }
          }
        }
      } catch {
        /* ignore corrupt draft */
      }

      void (async () => {
        try {
          const res = await fetch(
            `/api/studio/script/load?videoId=${encodeURIComponent(videoId)}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as {
            ok?: boolean;
            script?: ScriptDocument;
          };
          if (!res.ok || !data.ok || !data.script) return;
          applyDraft("", data.script);
          persist("", data.script);
        } catch {
          /* disk script unavailable */
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [videoId, persist]);

  useEffect(() => {
    if (seededDefault.current) return;
    const t = defaultBrief?.trim();
    if (!t || brief.trim() !== "") return;
    seededDefault.current = true;
    setBriefState(t);
    setShowSeededBanner(true);
  }, [defaultBrief, brief]);

  useEffect(() => {
    if (!videoId) return;
    const handle = window.setTimeout(() => {
      persist(brief, script);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [brief, script, videoId, persist]);

  useEffect(() => {
    if (!videoId || !script) return;
    fetch("/api/studio/script/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, script }),
    }).catch((err) => console.error("Error syncing script draft to server on load:", err));
  }, [script, videoId]);

  const setBrief = useCallback((v: string) => {
    setBriefState(v);
  }, []);

  const dismissSeededBanner = useCallback(() => {
    setShowSeededBanner(false);
  }, []);

  const resetSeedToBlank = useCallback(() => {
    setBriefState("");
    setScript(null);
    setShowSeededBanner(false);
    seededDefault.current = false;
    persist("", null);
  }, [persist]);

  const submitGenerate = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      setError(null);
      setScript(null);
      setCopyDone(false);
      startTransition(async () => {
        const out = await generateScript(brief);
        if (out.ok) {
          setScript(out.script);
          setGeneratedThisSession(true);
          persist(brief, out.script);
        } else {
          setError(out.error);
        }
      });
    },
    [brief, persist]
  );

  const copyTaggedTranscript = useCallback(async () => {
    if (!script) return;
    const text = formatScriptAsNarVis(script);
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, [script]);

  const value = useMemo<ScriptDraftContextValue>(
    () => ({
      videoId,
      brief,
      setBrief,
      script,
      error,
      pending,
      showSeededBanner,
      dismissSeededBanner,
      resetSeedToBlank,
      generatedThisSession,
      submitGenerate,
      copyTaggedTranscript,
      copyDone,
    }),
    [
      videoId,
      brief,
      setBrief,
      script,
      error,
      pending,
      showSeededBanner,
      dismissSeededBanner,
      resetSeedToBlank,
      generatedThisSession,
      submitGenerate,
      copyTaggedTranscript,
      copyDone,
    ]
  );

  return (
    <ScriptDraftContext.Provider value={value}>
      {children}
    </ScriptDraftContext.Provider>
  );
}
