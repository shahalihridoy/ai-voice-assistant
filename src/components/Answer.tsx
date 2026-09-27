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

const Answer = ({ answer, onSpeechError }: AnswerProps) => {
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
    <article className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="whitespace-pre-wrap text-base leading-7 text-stone-900">{answer}</p>
      <button type="button" onClick={speak} className={`${secondaryButtonClass} mt-3`}>
        Read aloud
      </button>
    </article>
  );
};

export default Answer;
