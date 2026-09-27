"use client";

import { useState } from "react";
import type { AskResponse, AskSource } from "@/types/rag";
import Answer from "@/components/Answer";
import { primaryButtonClass } from "@/components/buttonClasses";
import VoiceInput from "@/components/VoiceInput";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAskSource = (value: unknown): value is AskSource =>
  isRecord(value) &&
  typeof value.source === "string" &&
  typeof value.score === "number";

const isAskResponse = (value: unknown): value is AskResponse =>
  isRecord(value) &&
  typeof value.answer === "string" &&
  Array.isArray(value.sources) &&
  value.sources.every(isAskSource);

const readError = (value: unknown): string => {
  if (isRecord(value) && typeof value.error === "string" && value.error.trim()) {
    return value.error;
  }
  return "Could not answer the question";
};

const Chat = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AskSource[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    setError("");
    setAnswer("");
    setSources([]);

    if (!trimmed) {
      setError("Empty question");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(readError(payload));
        return;
      }

      if (!isAskResponse(payload)) {
        setError("The server returned an unexpected response");
        return;
      }

      setAnswer(payload.answer);
      setSources(payload.sources);
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <p className="text-sm font-medium tracking-wide text-teal-800">Riverside Clinic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Clinic Q&A
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-stone-600">
          Ask about hours, departments, doctors, and appointments. You can also request a
          serial number, or a hospital bill with a patient id.
        </p>
      </header>
      <form
        className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="question" className="text-sm font-medium text-stone-800">
          Question
        </label>
        <input
          id="question"
          name="question"
          value={question}
          placeholder="What time does the cardiology department open?"
          onChange={(event) => {
            setQuestion(event.target.value);
          }}
          disabled={loading}
          className="mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-50 disabled:text-stone-500"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? "Asking..." : "Ask"}
          </button>
          <VoiceInput
            disabled={loading}
            onQuestion={(transcript) => {
              setQuestion(transcript);
              void ask(transcript);
            }}
            onError={setError}
            onStart={() => {
              setError("");
            }}
          />
        </div>
      </form>
      {loading ? (
        <p className="mt-4 text-sm text-stone-600" aria-live="polite">
          One moment...
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Answer answer={answer} sources={sources} onSpeechError={setError} />
    </main>
  );
};

export default Chat;
