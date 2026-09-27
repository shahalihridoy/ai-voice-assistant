export type Chunk = {
  source: string;
  documentType: string;
  chunkIndex: number;
  text: string;
};

export type RetrievedChunk = Chunk & {
  score: number;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AskRequest = {
  messages: ChatTurn[];
};

export type AskSource = {
  source: string;
  score: number;
};

export type AskResponse = {
  answer: string;
  sources: AskSource[];
};
