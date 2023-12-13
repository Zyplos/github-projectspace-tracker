import { ActivityType, Client, GatewayIntentBits, Partials, PermissionFlagsBits } from "discord.js";
import config from "./config";
import { ProjectInstance } from "./github";
import { logFull } from "./common";

export class ProjectspaceBot {
  client: Client;
  projectInstance: ProjectInstance;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
    });

    this.projectInstance = new ProjectInstance();
  }

  updateClientStatus() {
    this.client.user?.setPresence({
      activities: [{ name: "projects", type: ActivityType.Watching }],
      status: "online",
    });
  }

  registerEventListeners() {
    this.client.on("ready", () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
      this.updateClientStatus();
      setInterval(this.updateClientStatus, 1000 * 60 * 15);
    });

    this.client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      if (message.channel.id !== config.discordBoardChannelId) return;

      // servers only
      if (!message.guild) return;

      // check if user has "Manage Server" permission
      const member = await message.guild.members.fetch(message.author.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

      // actual stuff
      const content = message.content.trim();

      if (content === "gb;forceupdate") {
        console.log("Forcing update");
      } else if (content === "gb;init") {
        console.log("⚙");
      }
    });
  }

  async start() {
    this.registerEventListeners();
    await this.projectInstance.getAllItems();
    await this.client.login(process.env.DISCORD_TOKEN);
  }

  devspace() {
    const detailedItems = this.projectInstance.getItemsByLabel(config.detailedStatusId);
    logFull(detailedItems);
  }
}
