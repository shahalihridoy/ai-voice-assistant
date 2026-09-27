"use client";

import { useRef, useState } from "react";
import ListeningIndicator from "@/components/ListeningIndicator";
import { secondaryButtonClass } from "@/components/buttonClasses";

type VoiceInputProps = {
  disabled: boolean;
  onQuestion: (question: string) => void;
  onError: (message: string) => void;
  onStart: () => void;
};

type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type BrowserSpeechRecognition = {
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const VoiceInput = ({ disabled, onQuestion, onError, onStart }: VoiceInputProps) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const listen = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      onError("Speech recognition is not available in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim() ?? "";
      if (!transcript) {
        onError("No speech was recognized.");
        return;
      }
      onQuestion(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "aborted") {
        return;
      }
      if (event.error === "no-speech") {
        onError("No speech was recognized.");
        return;
      }
      onError("Speech recognition failed.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      onStart();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      onError("Speech recognition is not available in this browser.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={listen}
        disabled={disabled || listening}
        className={secondaryButtonClass}
      >
        {listening ? "Listening..." : "Voice input"}
      </button>
      {listening ? <ListeningIndicator onStop={stopListening} /> : null}
    </>
  );
};

export default VoiceInput;
