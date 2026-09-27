"use client";

type ListeningIndicatorProps = {
  onStop: () => void;
};

const ListeningIndicator = ({ onStop }: ListeningIndicatorProps) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/55 px-6 backdrop-blur-sm">
      <div
        className="flex flex-col items-center"
        role="status"
        aria-live="polite"
      >
        <div className="siri-orb" aria-hidden="true">
          <span className="siri-blob siri-blob-cyan" />
          <span className="siri-blob siri-blob-violet" />
          <span className="siri-blob siri-blob-pink" />
          <span className="siri-blob siri-blob-green" />
          <span className="siri-core" />
        </div>
        <p className="mt-6 text-sm font-medium tracking-wide text-white">Listening</p>
        <button
          type="button"
          onClick={onStop}
          className="mt-4 rounded-full border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default ListeningIndicator;
