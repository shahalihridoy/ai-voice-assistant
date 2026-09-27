import { publicErrorMessage } from "@/lib/env";
import { answerQuestion } from "@/lib/rag/rag";

const asked = process.argv.slice(2).join(" ").trim();

const questions = asked
  ? [asked]
  : [
      "What time does the cardiology department open?",
      "What is the treatment for my heart condition?",
    ];

const main = async (): Promise<void> => {
  for (const question of questions) {
    const result = await answerQuestion([{ role: "user", content: question }]);
    console.log("Answer");
    console.log(result.answer);
    console.log("Sources");
    if (result.sources.length === 0) {
      console.log("None");
    } else {
      for (const source of result.sources) {
        console.log(`${source.source} ${source.score.toFixed(4)}`);
      }
    }
    console.log("");
  }
};

main().catch((error: unknown) => {
  console.error(publicErrorMessage(error, "Answer test failed"));
  process.exit(1);
});
