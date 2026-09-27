const SECRET_ENV_NAMES = [
  "QDRANT_API_KEY",
  "EMBEDDING_API_KEY",
  "LLM_API_KEY",
] as const;

export const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const publicErrorMessage = (error: unknown, fallback: string): string => {
  const raw = error instanceof Error ? error.message : fallback;
  const secrets = SECRET_ENV_NAMES.flatMap((name) => {
    const value = process.env[name]?.trim();
    return value ? [value] : [];
  });

  return secrets.reduce(
    (message, secret) => message.split(secret).join("[redacted]"),
    raw,
  );
};
