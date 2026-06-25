// eslint-disable-next-line @typescript-eslint/no-var-requires
const botModule = require("./bot");

const [, , jobId, pan] = process.argv;

if (!jobId || !pan) {
  console.error("Usage: node index.js <jobId> <pan>");
  process.exit(1);
}

botModule.runBot(jobId, pan).catch((err: any) => {
  console.error("Bot fatal error:", err);
  process.exit(1);
});