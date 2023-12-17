enum labels {
  boardMeetings = "bb57058b",
  shortTermTasks = "13484de5",
  ideaspace = "a69bf239",
  notStarted = "b4c16dd8",
  backlog = "05ad9749",
  inProgress = "cbc50043",
  done = "0628c7ad",
}

export const labelTitles = {
  [labels.boardMeetings]: "Board Meetings",
  [labels.shortTermTasks]: "Short Term Tasks",
  [labels.ideaspace]: "Ideaspace",
  [labels.notStarted]: "Not Started",
  [labels.backlog]: "Backlog",
  [labels.inProgress]: "In Progress",
  [labels.done]: "Done",
};

export default {
  projectNodeId: "PVT_kwDOBWhmWc4AFG96",
  statusFieldNodeId: "PVTSSF_lADOBWhmWc4AFG96zgC8axA=",
  githubUsernamesToDiscordIds: {
    buggy: "106893542867904329",
  },
  // prefixes set to "default" will add items to your project's default section
  // as per the "Item added to project" workflow rule
  optionPrefixes: {
    "i#": labels.ideaspace,
    "st#": labels.shortTermTasks,
    "t#": "default",
  },
  detailedStatusId: labels.shortTermTasks,
  summariedSectionIds: [labels.notStarted, labels.inProgress],
  projectBoardLink: "https://github.com/orgs/zyplos/projects/5",
  discordBoardTitle: "☀️ Spring 2024",

  timelineOnly: true,
  // inclusive, starts at midnight
  timelineStartDate: new Date(2023, 11, 1),
  // exclusive, ends at midnight the previous day
  timelineEndDate: new Date(2023, 11, 31),

  discordBoardChannelId: "520697468300689409",
  discordBoardMessageId: "1184624444119986297",

  discordIcons: {
    INPROGRESS: {
      1: "<a:tlInProgress1:1185425735394000946>",
      2: "<a:tlInProgress2:1185425736794918942>",
      3: "<a:tlInProgress3:1185425737533104269>",
    },
    STARTPOINT_TOP: "<:tlTickerStartTop:1185345737052147784>",
    STARTPOINT_BOTTOM: "<:tlTickerStartBottom:1185345586237550694>",
    MIDPOINT_TOP: "<:tlTickerMidTop:1185424952174850248>",
    MIDPOINT_BOTTOM: "<:tlTickerMidBottom:1185424950920761504>",
    ENDPOINT_TOP: "<:tlTickerEndTop:1185345583679021076>",
    ENDPOINT_BOTTOM: "<:tlTickerEndBottom:1185345582848553110>",

    BLANK: "<:__:1053765895220101180>",

    UPCOMING: "<:tlUpcoming:1185345683742527538>",
    COMPLETE: "<:tlComplete:1185422176313151538>",
  },
} as Config;

// don't mess with this!!
type Config = {
  projectNodeId: string;
  statusFieldNodeId: string;
  githubUsernamesToDiscordIds: Record<string, string>;
  optionPrefixes: Record<string, string>;
  detailedStatusId: string;
  summariedSectionIds: string[];
  projectBoardLink: string;
  discordBoardTitle?: string;

  timelineOnly?: boolean;
  timelineStartDate: Date;
  timelineEndDate: Date;

  discordBoardChannelId: string;
  discordBoardMessageId?: string;
  discordIcons: {
    INPROGRESS: Record<string, string>;
    STARTPOINT_TOP: string;
    STARTPOINT_BOTTOM: string;
    MIDPOINT_TOP: string;
    MIDPOINT_BOTTOM: string;
    ENDPOINT_TOP: string;
    ENDPOINT_BOTTOM: string;

    BLANK: string;

    UPCOMING: string;
    COMPLETE: string;
  };
};
