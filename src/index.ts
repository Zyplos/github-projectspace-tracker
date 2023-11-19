import dotenv from "dotenv";
import { logFull } from "./common";
dotenv.config();
import config from "./config";
import { ProjectInstance } from "./github";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_PERSONAL_TOKEN: string;
    }
  }
}

// check that all env variables are set
if (!process.env.GITHUB_PERSONAL_TOKEN) {
  throw new Error("Please make sure you have set the GITHUB_PERSONAL_TOKEN");
}

const projectInstance = new ProjectInstance();

async function main() {
  await projectInstance.getAllItems();

  const detailedItems = projectInstance.getItemsByLabel(config.detailedStatusId);
  logFull(detailedItems);
}

try {
  main();
} catch (error) {
  console.error(error);
  // exit with a failure code
  process.exit(1);
}
