import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Message,
  MessageEditOptions,
  Partials,
  PermissionFlagsBits,
} from "discord.js";
import config, { labelTitles } from "./config";
import { ProjectInstance, makeDraftItem, setItemField } from "./github";
import { isStringBlank, logFull } from "./common";
import { getCurrentSegmentIndex, getPercentageOfTimelineElapsed, getCurrentSegmentPartIndex } from "./dateStuff";

export class ProjectspaceBot {
  client: Client;
  projectInstance: ProjectInstance;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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

    // on client get message
    this.client.on("messageCreate", this.createTodoFromMessage.bind(this));
  }

  async start() {
    this.registerEventListeners();
    if (!config.timelineOnly) {
      await this.projectInstance.getAllItems();
      // logFull(this.projectInstance.allItems);
    }
    await this.client.login(process.env.DISCORD_TOKEN);

    // if discordBoardChannelId and discordBoardMessageId are set correctly then update the board
    if (
      !isStringBlank(config.discordBoardChannelId) &&
      config.discordBoardMessageId &&
      !isStringBlank(config.discordBoardMessageId)
    ) {
      try {
        await this.updateBoard();
      } catch (error) {
        logFull(error);
      }
    } else {
      console.log("Board was not updated. Make sure discordBoardChannelId and discordBoardMessageId are set.");
    }

    // if not, the bot should still launch so people can create the init message to put in the config
  }

  async createTodoFromMessage(message: Message) {
    const { optionPrefixes, githubUsernamesToDiscordIds } = config;
    const prefixes = Object.keys(optionPrefixes);
    const allowedUsers = Object.values(githubUsernamesToDiscordIds);

    if (!allowedUsers.includes(message.author.id)) return;

    const prefix = prefixes.find((prefix) => message.content.startsWith(prefix));
    if (!prefix) return;

    const todoItemTitle = message.content.slice(prefix.length).trim();

    const optionId = optionPrefixes[prefix];
    message.channel.send(`GOT ${prefix} FOR ${labelTitles[optionId] || "default"} | TITLE ${todoItemTitle}`);

    try {
      const newItemId = await makeDraftItem(todoItemTitle, "Created from Discord");

      if (optionId.toLowerCase() === "default") {
        message.react("✅");
      } else {
        await setItemField(newItemId, optionId);

        message.react("✅");
      }
    } catch (e) {
      console.error(e);
      message.reply(
        `Unable to completely add new item to ${labelTitles[optionId] || "default"}.\n${(e as Error).toString()}}`
      );
    }
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
    // grab fresh data from github
    if (!config.timelineOnly) {
      await this.projectInstance.getAllItems();
      // logFull(this.projectInstance.allItems);
    }

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
    // console.log("SCHEDULING IN ", millisecondsUntilMidnight / 1000 / 60);

    // Set the timeout to execute the callback at midnight
    // using.bind() fixes the this scope for updateBoard https://stackoverflow.com/a/5911280
    setTimeout(this.updateBoard.bind(this), millisecondsUntilMidnight);
  }

  generateBoardEmbed() {
    const timelineData = this.getTimelineData();
    console.log(timelineData);

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

    if (timelineData.timelinePercentDone < 100) {
      monthArray = Array(10).fill(UPCOMING);
      for (let i = 0; i < timelineData.currentSegmentIndex; i++) {
        monthArray[i] = COMPLETE;
      }

      monthArray[timelineData.currentSegmentIndex] = INPROGRESS[timelineData.currentSegmentPartIndex];
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
        text: `🗓️ ${timelineData.timelinePercentDone}% complete`,
      });

    if (config.discordBoardTitle) {
      timelineEmbed.setTitle(config.discordBoardTitle);
    }

    if (config.timelineOnly) {
      return [timelineEmbed];
    }

    const boardItems = this.getGitHubData();
    logFull(boardItems);
    const boardEmbed = new EmbedBuilder()
      .setTitle("🗃️ Project Board")
      .setDescription("\t")
      .addFields({
        name: `[${boardItems.detailed.amount}] ${boardItems.detailed.label}`,
        value: boardItems.detailed.output,
      })
      .addFields({
        name: "At a Glance",
        value: boardItems.summaried.output,
      })
      .setColor(boardColor)
      .setFooter({
        text: `📋 ${boardItems.totalAmount} pending items, last checked`,
      })
      .setTimestamp();

    if (config.disableTimeline) {
      return [boardEmbed];
    }

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

  getGitHubData() {
    const { detailedStatusId, summariedSectionIds } = config;
    let totalTrackedItemAmount = 0;

    const detailedGitHubItems = this.projectInstance.getItemsByLabel(detailedStatusId);
    const detailedGitHubItemsAmount = detailedGitHubItems.length;
    totalTrackedItemAmount += detailedGitHubItemsAmount;
    let detailedDiscordItems = "";

    const STRING_LIMIT = 3980;

    let MAX_FLAG = false;
    for (let i = 0; i < detailedGitHubItems.length; i++) {
      const item = detailedGitHubItems[i];
      if (!item.content) continue;
      const { title, assignees } = item.content;

      detailedDiscordItems += `${title}`;

      if (!assignees.nodes || assignees.nodes.length === 0) {
        detailedDiscordItems += "\n";
        continue;
      }
      detailedDiscordItems += " • ";
      for (let j = 0; j < assignees.nodes.length; j++) {
        const node = assignees.nodes[j];
        if (!node) continue;

        const githubUsername = node.login;
        const discordId = config.githubUsernamesToDiscordIds[githubUsername.toLocaleLowerCase()];

        const userMentionString = discordId ? `<@${discordId}>` : githubUsername;
        if ((detailedDiscordItems + `${userMentionString} `).length > STRING_LIMIT) {
          MAX_FLAG = true;
          break;
        } else {
          detailedDiscordItems += `${userMentionString} `;
        }
      }

      if (MAX_FLAG) {
        detailedDiscordItems += "\n\nView the rest on GitHub.";
        break;
      }

      detailedDiscordItems += "\n";
    }

    if (detailedGitHubItemsAmount === 0) {
      detailedDiscordItems = "No todos!";
    }

    const summariedGitHubItems = summariedSectionIds.map((id) => this.projectInstance.getItemsByLabel(id));

    // get assignees from all items without duplicates
    const assigneesArray: Set<string>[] = [];
    summariedGitHubItems.forEach((section) => {
      const assigneesSet = new Set<string>();
      section.forEach((item) => {
        if (!item.content) return;
        const { assignees } = item.content;

        if (!assignees.nodes) return;
        assignees.nodes.forEach((node) => {
          if (!node) return;

          const githubUsername = node.login;

          assigneesSet.add(githubUsername);
        });
      });
      assigneesArray.push(assigneesSet);
    });

    // get length of each array in summariedGitHubItems
    const summariedGitHubItemsLengths = summariedGitHubItems.map((section) => section.length);

    // put it all together
    let summariedDiscordItems = "";
    summariedSectionIds.forEach((sectionId, index) => {
      const sectionLabel = labelTitles[sectionId];
      const sectionAmount = summariedGitHubItemsLengths[index];
      totalTrackedItemAmount += sectionAmount;

      const sectionAssigneesRaw = assigneesArray[index];
      const sectionAssignees = Array.from(sectionAssigneesRaw);

      // use discordid if it exists, otherwise use github username
      const sectionAssigneesDiscordRaw = sectionAssignees.map((username) => {
        const discordId = config.githubUsernamesToDiscordIds[username.toLocaleLowerCase()];
        if (discordId) {
          return `<@${discordId}>`;
        } else {
          return username;
        }
      });

      const sectionAssigneesFormatted = sectionAssigneesDiscordRaw.join(" ");

      summariedDiscordItems += `**[${sectionAmount}]** ${sectionLabel}`;
      if (!isStringBlank(sectionAssigneesFormatted)) {
        summariedDiscordItems += ` • ${sectionAssigneesFormatted}`;
      }
      summariedDiscordItems += "\n";
    });

    return {
      detailed: {
        label: labelTitles[detailedStatusId],
        output: detailedDiscordItems,
        amount: detailedGitHubItemsAmount,
      },
      summaried: {
        output: summariedDiscordItems,
      },
      totalAmount: totalTrackedItemAmount,
    };
  }
}
