"use client";

import { useEffect, useRef, useState } from "react";
import type { AskResponse, AskSource, ChatTurn } from "@/types/rag";
import Answer from "@/components/Answer";
import { primaryButtonClass } from "@/components/buttonClasses";
import VoiceInput from "@/components/VoiceInput";

type ThreadMessage = ChatTurn & {
  id: string;
  sources: AskSource[];
};

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
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ThreadMessage[]>([]);
  const sendingRef = useRef(false);
  messagesRef.current = messages;

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) {
      return;
    }
    thread.scrollTop = thread.scrollHeight;
  }, [messages, loading]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Empty question");
      return;
    }
    if (sendingRef.current) {
      return;
    }

    const userMessage: ThreadMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      sources: [],
    };
    const history = [...messagesRef.current, userMessage];
    sendingRef.current = true;
    setMessages(history);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
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

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.answer,
          sources: payload.sources,
        },
      ]);
    } catch {
      setError("Could not reach the server");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="shrink-0">
        <p className="text-sm font-medium tracking-wide text-teal-800">Riverside Clinic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          Clinic Q&A
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-stone-600">
          Ask about hours, departments, doctors, and appointments. Follow-ups keep this
          conversation, so you can ask for a patient&apos;s details and then their bill without
          repeating the id.
        </p>
      </header>
      <div
        ref={threadRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="mt-6 min-h-0 flex-1 overflow-y-auto"
      >
        <div className="flex min-h-full flex-col gap-3 py-2">
          {messages.length === 0 ? (
            <p className="m-auto max-w-sm text-center text-sm leading-6 text-stone-500">
              Messages show up here. A later message can refer to an earlier one, such as a patient
              id.
            </p>
          ) : (
            <>
              <div className="mt-auto" />
              {messages.map((message) =>
                message.role === "user" ? (
                  <p
                    key={message.id}
                    className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-teal-800 px-4 py-3 text-base leading-7 text-white"
                  >
                    {message.content}
                  </p>
                ) : (
                  <Answer
                    key={message.id}
                    answer={message.content}
                    sources={message.sources}
                    onSpeechError={setError}
                  />
                ),
              )}
            </>
          )}
          {loading ? (
            <p className="self-start text-sm text-stone-600" aria-live="polite">
              One moment...
            </p>
          ) : null}
        </div>
      </div>
      {error ? (
        <p
          className="mt-3 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <form
        className="mt-4 shrink-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="question" className="text-sm font-medium text-stone-800">
          Message
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
            {loading ? "Sending..." : "Send"}
          </button>
          <VoiceInput
            disabled={loading}
            onQuestion={(transcript) => {
              void ask(transcript);
            }}
            onError={setError}
            onStart={() => {
              setError("");
            }}
          />
        </div>
      </form>
    </main>
  );
};

export default Chat;
