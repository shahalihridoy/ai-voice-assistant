You are a senior software architect and AI/RAG engineer.

I want to build a very simple educational project to learn Retrieval-Augmented Generation (RAG) from first principles.

## Project

Build a **Simple Clinic Q&A RAG application**.

The user should be able to:

1. Ask a clinic-related question by typing or speaking.
2. Convert speech to text when voice input is used.
3. Search the clinic's knowledge base using RAG.
4. Generate an answer using only the retrieved clinic information.
5. Display the answer as text.
6. Optionally read the answer aloud using browser text-to-speech.

Example:

User:
"What time does the cardiology department open?"

System:

- Convert question to text.
- Generate an embedding for the question.
- Search the vector database.
- Retrieve the most relevant clinic information.
- Send the question + retrieved context to the LLM.
- Generate a grounded answer.
- Display the answer.

---

# IMPORTANT ARCHITECTURE PRINCIPLES

This is an educational RAG project.

Keep the architecture SIMPLE.

Do NOT introduce unnecessary infrastructure.

Do NOT use:

- NestJS initially
- LangChain
- LlamaIndex
- AI agents
- Redis
- PostgreSQL
- Authentication
- Patient database
- Appointment database
- Microservices
- Kubernetes
- Docker unless genuinely required
- Complex state management
- Complex UI frameworks beyond the chosen UI library

I want to understand how RAG works internally rather than hiding everything behind an abstraction.

Implement the RAG pipeline manually using straightforward TypeScript functions.

---

# TECH STACK

Frontend:

- Next.js
- TypeScript
- React

Backend:

- Next.js API routes / Route Handlers
- TypeScript

Vector database:

- Qdrant Cloud

Embeddings:

- A cloud embedding API

LLM:

- A cloud LLM API

Voice:

- Browser Web Speech API for Speech Recognition
- Browser Speech Synthesis API for text-to-speech

Knowledge base:

- Markdown files stored inside the project

Example knowledge files:

/knowledge
clinic.md
doctors.md
departments.md
appointments.md
faq.md

---

# HIGH-LEVEL ARCHITECTURE

The system should have two separate pipelines.

## 1. INGESTION PIPELINE

Knowledge files
↓
Load documents
↓
Split into chunks
↓
Generate embeddings
↓
Store vectors + metadata in Qdrant

This pipeline should be manually executable.

Example:

npm run ingest

It should:

1. Read all Markdown files from `/knowledge`.
2. Split the documents into reasonable chunks.
3. Generate embeddings for each chunk.
4. Store the embeddings in Qdrant.
5. Store useful metadata alongside each vector.

Metadata should include at minimum:

- source
- document type
- chunk index
- original text

Do not over-engineer chunking initially.

Start with a simple deterministic chunking strategy.

---

# 2. QUERY PIPELINE

User question
↓
Speech-to-text (if voice)
↓
Generate question embedding
↓
Qdrant similarity search
↓
Retrieve top K chunks
↓
Build grounded prompt
↓
LLM
↓
Answer
↓
Display text
↓
Optional text-to-speech

The query pipeline should be easy to understand by reading the code.

---

# PROJECT STRUCTURE

Use a clean but simple structure similar to:

src/
app/
page.tsx
api/
ask/
route.ts

components/
Chat.tsx
VoiceInput.tsx
Answer.tsx

lib/
rag/
chunk.ts
embed.ts
retrieve.ts
prompt.ts
generate.ts
rag.ts

```
qdrant/
  client.ts

llm/
  client.ts
```

types/
rag.ts

scripts/
ingest.ts

knowledge/
clinic.md
doctors.md
departments.md
appointments.md
faq.md

---

# RAG MODULE RESPONSIBILITIES

Keep each responsibility isolated.

## chunk.ts

Responsible only for document chunking.

Input:

string

Output:

Chunk[]

Do not call APIs from this file.

---

## embed.ts

Responsible for generating embeddings.

Create a clean function such as:

embedText(text: string)

Do not mix embedding logic with Qdrant logic.

---

## retrieve.ts

Responsible for vector search.

Input:

question embedding

Output:

retrieved chunks

It should:

1. Query Qdrant.
2. Retrieve top K results.
3. Return the chunk text and metadata.
4. Preserve similarity scores.

---

## prompt.ts

Responsible only for constructing the LLM prompt.

The prompt must clearly instruct the LLM:

- Answer using only the provided clinic context.
- Do not invent information.
- If the answer cannot be found in the context, say that the clinic knowledge base does not contain the information.
- Do not use outside knowledge.
- Keep answers concise and helpful.

---

## generate.ts

Responsible only for calling the LLM.

Input:

question + retrieved context

Output:

generated answer

---

## rag.ts

This should orchestrate the entire RAG pipeline.

Conceptually:

question
↓
embed
↓
retrieve
↓
build prompt
↓
generate
↓
answer

Keep this function easy to understand.

For example:

answerQuestion(question)

should internally perform the complete pipeline.

---

# API

Create:

POST /api/ask

Request:

{
"question": "What time does the cardiology department open?"
}

Response:

{
"answer": "...",
"sources": [
{
"source": "departments.md",
"score": 0.87
}
]
}

Do not expose API keys to the browser.

All LLM, embedding, and Qdrant credentials must remain server-side.

Use environment variables.

Example:

QDRANT_URL=
QDRANT_API_KEY=
EMBEDDING_API_KEY=
LLM_API_KEY=

Do not hardcode secrets.

---

# UI

Create an intentionally simple interface.

It should contain:

- Clinic Q&A title
- Text input
- Ask button
- Voice input button
- Loading state
- Answer area
- Retrieved sources area
- Text-to-speech button

Do not build a polished production UI yet.

The purpose is learning RAG.

---

# VOICE FLOW

Use browser APIs initially.

Voice input:

Microphone
↓
Browser Speech Recognition
↓
Text question
↓
POST /api/ask
↓
RAG
↓
Answer
↓
Browser Speech Synthesis

Do not introduce external speech APIs initially.

The voice layer should be completely separate from the RAG layer.

RAG must work perfectly with normal text input even if voice functionality is unavailable.

---

# SOURCE DISPLAY

The UI should show which knowledge chunks were used.

For example:

Answer:
"The cardiology department is open from 9 AM to 5 PM."

Sources:

- departments.md — similarity 0.87
- clinic.md — similarity 0.72

This is important because I want to understand retrieval quality.

---

# ERROR HANDLING

Implement basic error handling.

Handle:

- Missing environment variables
- Qdrant connection errors
- Embedding API errors
- LLM errors
- Empty questions
- No relevant search results
- Browser speech recognition unavailable

Do not build an elaborate error framework.

Return useful errors to the UI.

Never expose secrets or sensitive API responses to the client.

---

# RAG SAFETY / GROUNDING

The system must avoid answering questions that are not supported by the clinic knowledge base.

For example:

Knowledge base:
"Cardiology department is open from 9 AM to 5 PM."

Question:
"What is the treatment for my heart condition?"

The system should NOT invent a medical answer.

It should respond approximately:

"I don't have enough information in the clinic knowledge base to answer that question."

The LLM must be explicitly instructed to stay within retrieved context.

Also include a configurable similarity threshold.

If retrieved results are below the threshold, treat the question as having insufficient context instead of blindly sending irrelevant context to the LLM.

---

# CONFIGURATION

Keep configurable values in one place.

For example:

TOP_K
SIMILARITY_THRESHOLD
CHUNK_SIZE
CHUNK_OVERLAP

Do not scatter magic numbers throughout the code.

---

# LOGGING

For development, log the RAG pipeline clearly on the server:

Question
↓
Embedding generated
↓
Retrieved chunks
↓
Similarity scores
↓
Prompt generated
↓
LLM response

Do not log API keys or sensitive information.

---

# TYPESCRIPT

Use strict TypeScript.

Avoid:

- any
- unnecessary type assertions
- duplicated interfaces
- unnecessary abstractions

Create shared types where appropriate.

---

# ENVIRONMENT

Create:

.env.example

with all required variables.

Never commit `.env`.

Make sure `.gitignore` protects secrets.

---

# DEVELOPMENT PHASES

Do NOT implement everything at once.

Implement the project in these phases.

## Phase 1 — Basic RAG

Implement only:

Markdown documents
→ chunking
→ embeddings
→ Qdrant
→ similarity search

The goal is to verify that retrieval works.

Create a simple test/debug command such as:

npm run test:retrieval

It should accept a question and print:

Question

Retrieved chunks

Similarity scores

Source documents

Do not involve the LLM yet.

---

## Phase 2 — Grounded Generation

Add:

Retrieved chunks
→ prompt
→ LLM
→ answer

Test that the LLM only answers using retrieved context.

---

## Phase 3 — Web UI

Connect the RAG pipeline to:

POST /api/ask

Then build the simple React UI.

---

## Phase 4 — Voice

Add browser speech recognition and speech synthesis.

Keep this layer independent from RAG.

---

# FUTURE LEARNING

Do NOT implement these now.

Leave the architecture easy to extend later for:

1. Better chunking
2. Metadata filtering
3. Hybrid search
4. BM25
5. Reranking
6. Query rewriting
7. Conversation memory
8. RAG evaluation
9. Citation quality
10. Streaming responses
11. Production observability
12. Codebase RAG

The current implementation should make these additions possible without rewriting the entire project.

---

# MOST IMPORTANT REQUIREMENT

I am building this project primarily to LEARN RAG.

Therefore:

- Prefer explicit code over abstractions.
- Prefer understandable code over clever code.
- Prefer simple functions over frameworks.
- Explain important RAG decisions in comments.
- Do not hide retrieval behind LangChain.
- Do not hide the embedding process.
- Do not hide vector search.
- Do not hide prompt construction.

Every major RAG step should be visible in the source code.

Before writing code, first inspect the repository and existing configuration.

Then:

1. Propose the final folder structure.
2. Explain the data flow.
3. Identify required dependencies.
4. Identify required environment variables.
5. Implement Phase 1 only.
6. Run/type-check/test Phase 1.
7. Report what was implemented and what remains.

Do not implement Phase 2–4 until Phase 1 is working correctly.
