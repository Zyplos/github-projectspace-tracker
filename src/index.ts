import dotenv from "dotenv";
dotenv.config();
import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";

import { logFull } from "./common";
import config from "./config";
import { ProjectInstance } from "./github";

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

// ===== creating instances
const projectInstance = new ProjectInstance();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

function updateClientStatus() {
  client.user?.setPresence({ activities: [{ name: "projects", type: ActivityType.Watching }], status: "online" });
}

// ===== discord stuff
client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  updateClientStatus();
  setInterval(updateClientStatus, 1000 * 60 * 15);
});

// ====

async function main() {
  // await projectInstance.getAllItems();

  // const detailedItems = projectInstance.getItemsByLabel(config.detailedStatusId);
  // logFull(detailedItems);

  await client.login(process.env.DISCORD_TOKEN);
}

// actually start the stuff
try {
  main();
} catch (error) {
  console.error(error);
  // exit with a failure code
  process.exit(1);
}
