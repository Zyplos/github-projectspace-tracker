import {
  ActivityType,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
} from "discord.js";
import config from "./config";
import { ProjectInstance } from "./github";
import { isStringBlank, logFull } from "./common";
import { getPercentageOfMonthDone, getPercentageOfYearElapsed, getThird } from "./dateStuff";

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

  registerEventListeners() {
    this.client.on("ready", () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
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
        // TODO
        console.log("UNIMPLEMENTED");
      } else if (content === "gb;init") {
        message.channel.send("⚙");
      }
    });
  }

  async start() {
    this.registerEventListeners();
    // await this.projectInstance.getAllItems();
    await this.client.login(process.env.DISCORD_TOKEN);

    // if discordBoardChannelId and discordBoardMessageId are set correctly then update the board
    if (!isStringBlank(config.discordBoardChannelId) && !isStringBlank(config.discordBoardMessageId)) {
      this.updateBoard();
    } else {
      console.log("Board was not updated. Make sure discordBoardChannelId and discordBoardMessageId are set.");
    }

    // if not, the bot should still launch so people can create the init message to put in the config
  }

  devspace() {
    const detailedItems = this.projectInstance.getItemsByLabel(config.detailedStatusId);
    logFull(detailedItems);
  }

  async getBoardChannel() {
    return await this.client.channels.fetch(config.discordBoardChannelId);
  }

  async updateBoard(reschedule: boolean = true) {
    const channel = await this.getBoardChannel();
    if (!channel) {
      console.error(
        `Could not find channel with id ${config.discordBoardChannelId}. Make sure the bot has permissions to see this channel.`
      );
      // quit the process, no point in rescheduling future updates if bot can't see channel
      process.exit(-1);
    }
    if (channel.type !== ChannelType.GuildText) {
      console.error(`Channel with id ${config.discordBoardChannelId} is not a text channel.`);
      process.exit(-1);
    }

    const message = await channel.messages.fetch(config.discordBoardMessageId);
    const pingEmbed = this.generateBoardEmbed();
    await message.edit({ content: "\t", embeds: [pingEmbed] });

    if (reschedule) this.rescheduleUpdate();
  }

  async rescheduleUpdate() {
    // Get the current date and time
    const now = new Date();

    if (now.getDay() === 0) {
      // await fetchAndSaveData();
    }

    // Set the time for midnight the following day
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3);

    // Calculate the number of milliseconds until midnight
    const millisecondsUntilMidnight = midnight.getTime() - now.getTime();

    console.log(millisecondsUntilMidnight / 1000 / 60 / 60);

    // Set the timeout to execute the callback at midnight
    setTimeout(this.updateBoard, millisecondsUntilMidnight);
  }

  generateBoardEmbed() {
    const calcData = this.calculateData();
    console.log(calcData);

    const inProgressIcons = {
      1: "<a:monthInProgress1:1055628645076582532>",
      2: "<a:monthInProgress2:1055628646313885706>",
      3: "<a:monthInProgress3:1055628647333122081>",
    };

    const monthArray = Array(12).fill("<:month:1055621854313848964>");
    if (calcData.elapsedMonths !== 0) {
      for (let i = 0; i <= calcData.elapsedMonths; i++) {
        monthArray[i] = "<:monthComplete:1055621855844769842>";
      }
    }

    monthArray[calcData.currentMonth] = inProgressIcons[calcData.thirdOfMonth];

    const pingEmbed = new EmbedBuilder()
      .setDescription(
        `${monthArray.join(
          ""
        )}\n\n\n[2] Short Term Tasks\nfinish team outreach stuff <@204620732259368960>\ngeneric todo item <@204620732259368960>\n\n[4] Not Started\nanother todo item <@204620732259368960>\neven more todo stuff really important <@204620732259368960>\ndont forget this one <@204620732259368960>\nand one more <@204620732259368960>`
      )
      .setColor(0x2b2d31)
      .setFooter({
        text: `🗓️ This semester is ${calcData.yearPercentDone}% complete`,
      });

    return pingEmbed;
  }

  calculateData() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const elapsedMonths = currentDate.getMonth();
    const yearPercentDone = Math.round((getPercentageOfYearElapsed() + Number.EPSILON) * 10) / 10;

    const monthPercentDone = getPercentageOfMonthDone();
    const thirdOfMonth = getThird(monthPercentDone);

    return {
      elapsedMonths,
      yearPercentDone,
      thirdOfMonth,
      currentMonth,
      currentYear,
    };
  }
}
