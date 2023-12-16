import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageEditOptions,
  Partials,
  PermissionFlagsBits,
} from "discord.js";
import config from "./config";
import { ProjectInstance } from "./github";
import { isStringBlank, logFull } from "./common";
import { getCurrentSegmentIndex, getPercentageOfTimelineElapsed, getCurrentSegmentPartIndex } from "./dateStuff";

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

      if (content === "gb;init") {
        message.channel.send("⚙");
      }
    });
  }

  async start() {
    this.registerEventListeners();
    if (!config.timelineOnly) {
      // await this.projectInstance.getAllItems();
    }
    await this.client.login(process.env.DISCORD_TOKEN);

    // if discordBoardChannelId and discordBoardMessageId are set correctly then update the board
    if (
      !isStringBlank(config.discordBoardChannelId) &&
      config.discordBoardMessageId &&
      !isStringBlank(config.discordBoardMessageId)
    ) {
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
    if (!config.discordBoardMessageId || isStringBlank(config.discordBoardMessageId)) {
      console.error("Tried to update the board but discordBoardMessageId is not set in config.");
      process.exit(-1);
    }

    const message = await channel.messages.fetch(config.discordBoardMessageId);
    const embeds = this.generateBoardEmbed();

    // create link button
    const button = new ButtonBuilder()
      .setLabel("View on GitHub")
      .setURL(config.projectBoardLink)
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    let payload: MessageEditOptions = { content: "\t", embeds, components: [] };

    if (!config.timelineOnly) {
      payload.components = [row];
    }

    await message.edit(payload);

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

    console.log("SCHEDULING IN ", millisecondsUntilMidnight / 1000 / 60);

    // Set the timeout to execute the callback at midnight
    // using.bind() fixes the this scope for updateBoard https://stackoverflow.com/a/5911280
    setTimeout(this.updateBoard.bind(this), millisecondsUntilMidnight);
  }

  generateBoardEmbed() {
    const calcData = this.getTimelineData();
    console.log(calcData);

    const {
      INPROGRESS,
      STARTPOINT_TOP,
      STARTPOINT_BOTTOM,
      MIDPOINT_TOP,
      MIDPOINT_BOTTOM,
      ENDPOINT_TOP,
      ENDPOINT_BOTTOM,
      BLANK,
      UPCOMING,
      COMPLETE,
    } = config.discordIcons;

    let monthArray = [];

    if (calcData.timelinePercentDone < 100) {
      monthArray = Array(10).fill(UPCOMING);
      for (let i = 0; i < calcData.currentSegmentIndex; i++) {
        monthArray[i] = COMPLETE;
      }

      monthArray[calcData.currentSegmentIndex] = INPROGRESS[calcData.currentSegmentPartIndex];
    } else {
      monthArray = Array(10).fill(COMPLETE);
    }

    const boardColor = 0x2b2d31;

    const topTickers =
      STARTPOINT_TOP + Array(3).fill(BLANK).join("") + MIDPOINT_TOP + Array(4).fill(BLANK).join("") + ENDPOINT_TOP;
    const middleIcons = monthArray.join("");
    const bottomTickers =
      STARTPOINT_BOTTOM +
      Array(3).fill(BLANK).join("") +
      MIDPOINT_BOTTOM +
      Array(4).fill(BLANK).join("") +
      ENDPOINT_BOTTOM;

    const OUTPUT = [topTickers, middleIcons, bottomTickers].join("\n");

    const timelineEmbed = new EmbedBuilder()
      .setDescription(OUTPUT)
      .setColor(boardColor)
      .setFooter({
        text: `🗓️ This semester is ${calcData.timelinePercentDone}% complete`,
      });

    if (config.discordBoardTitle) {
      timelineEmbed.setTitle(config.discordBoardTitle);
    }

    if (config.timelineOnly) {
      return [timelineEmbed];
    }

    const boardEmbed = new EmbedBuilder()
      .setTitle("🗃️ Project Board")
      .setDescription("Pending items from:\n<@204620732259368960>")
      .addFields({
        name: "[2] Short Term Tasks",
        value: "finish team outreach stuff <@204620732259368960>\ngeneric todo item <@204620732259368960>",
      })
      .addFields({
        name: "[4] Not Started",
        value:
          "another todo item <@204620732259368960>\neven more todo stuff really important <@204620732259368960>\ndont forget this one <@204620732259368960>\nand one more <@204620732259368960>",
      })
      .addFields({
        name: "At a Glance",
        value: "**[1]** Backlog\n**[4]** In Progress\n**[23]** ideaspace",
      })
      .setColor(boardColor)
      .setFooter({
        text: `📋 20 pending items as of`,
      })
      .setTimestamp();

    return [timelineEmbed, boardEmbed];
  }

  getTimelineData() {
    const timelinePercentDone = getPercentageOfTimelineElapsed();
    const currentSegmentIndex = getCurrentSegmentIndex(timelinePercentDone);
    const currentSegmentPartIndex = getCurrentSegmentPartIndex(timelinePercentDone);

    return {
      timelinePercentDone,
      currentSegmentIndex,
      currentSegmentPartIndex,
    };
  }
}
