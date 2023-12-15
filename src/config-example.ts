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

type Config = {
  projectNodeId: string;
  statusFieldNodeId: string;
  githubUsernamesToDiscordIds: Record<string, string>;
  optionPrefixes: Record<string, string>;
  defaultPrefix: string;
  defaultAddToStatusId: string;
  detailedStatusId: string;
  summariedSectionIds: string[];
  projectBoardLink: string;

  discordBoardChannelId: string;
  discordBoardMessageId?: string;
  discordBoardTitle?: string;

  timelineOnly?: boolean;
};

export default {
  projectNodeId: "PVT_kwDOBWhmWc4AFG96",
  statusFieldNodeId: "PVTSSF_lADOBWhmWc4AFG96zgC8axA=",
  githubUsernamesToDiscordIds: {
    buggy: "106893542867904329",
  },
  optionPrefixes: {
    "i#": labels.ideaspace,
    "st#": labels.shortTermTasks,
  },
  defaultPrefix: "t#",
  defaultAddToStatusId: labels.ideaspace,
  detailedStatusId: labels.shortTermTasks,
  summariedSectionIds: [labels.notStarted, labels.inProgress],
  projectBoardLink: "https://github.com/orgs/zyplos/projects/5",
  discordBoardTitle: "☀️ Spring 2024",

  // if you'd only like to use the timeline stuff, set this to true
  // you can leave the things above this as empty strings
  timelineOnly: true,

  discordBoardChannelId: "520697468300689409",
  discordBoardMessageId: "1184624444119986297",
} as Config;
