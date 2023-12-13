import dotenv from "dotenv";
dotenv.config();

import { ProjectspaceBot } from "./discord";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_PERSONAL_TOKEN: string;
      DISCORD_TOKEN: string;
    }
  }
}

// check that all env variables are set
if (!process.env.GITHUB_PERSONAL_TOKEN || !process.env.DISCORD_TOKEN) {
  throw new Error("Please make sure you have set GITHUB_PERSONAL_TOKEN and DISCORD_TOKEN in .env");
}

// ===== create ProjectspaceBot instance
const projectspaceBot = new ProjectspaceBot();

async function main() {
  await projectspaceBot.start();
}

// actually start the stuff
try {
  main();
} catch (error) {
  console.error(error);
  // exit with a failure code
  process.exit(1);
}
