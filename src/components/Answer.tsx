"use client";

import { useEffect, useRef } from "react";
import { secondaryButtonClass } from "@/components/buttonClasses";
import type { AskSource } from "@/types/rag";

type AnswerProps = {
  answer: string;
  sources: AskSource[];
  onSpeechError: (message: string) => void;
};

const pickEnglishVoice = (
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined => {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return english.find((voice) => voice.localService) ?? english[0];
};

const Answer = ({ answer, sources, onSpeechError }: AnswerProps) => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }
    synth.getVoices();
  }, []);

  if (!answer) {
    return null;
  }

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) {
      onSpeechError("Text-to-speech is not available in this browser.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = "en-US";
    const voice = pickEnglishVoice(synth.getVoices());
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        return;
      }
      onSpeechError("Text-to-speech failed.");
    };
    // Keep the utterance alive. Chrome drops speech if it is garbage-collected.
    utteranceRef.current = utterance;

    const start = () => {
      // Chrome and Safari often leave the engine paused, so speak() stays silent
      // until resume(). cancel() in the same turn as speak() also drops the utterance.
      synth.resume();
      synth.speak(utterance);
      synth.resume();
    };

    if (synth.speaking || synth.pending) {
      synth.cancel();
      window.setTimeout(start, 0);
      return;
    }

    start();
  };

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-medium tracking-wide text-teal-800">Answer</h2>
      <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{answer}</p>
      <button type="button" onClick={speak} className={`${secondaryButtonClass} mt-4`}>
        Read aloud
      </button>
      {sources.length > 0 ? (
        <>
          <h2 className="mt-6 text-sm font-medium tracking-wide text-stone-500">Sources</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {sources.map((source) => (
              <li
                key={`${source.source}-${source.score}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="font-medium text-stone-800">{source.source}</span>
                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                  similarity {source.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
};

export default Answer;
