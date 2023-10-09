import dotenv from "dotenv";
dotenv.config();
import util from "util";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_PERSONAL_TOKEN: string;
      PROJECT_ID: string;
      STATUS_FIELD_ID: string;
      STATUS_OPTION_ID: string;
    }
  }
}

// check that all env variables are set
if (
  !process.env.GITHUB_PERSONAL_TOKEN ||
  !process.env.PROJECT_ID ||
  !process.env.STATUS_FIELD_ID ||
  !process.env.STATUS_OPTION_ID
) {
  throw new Error(
    "Please make sure you have set the GITHUB_PERSONAL_TOKEN, PROJECT_ID, STATUS_FIELD_ID and STATUS_OPTION_ID env variables."
  );
}

import { Octokit } from "octokit";
import type {
  AddProjectV2DraftIssuePayload,
  Maybe,
  PageInfo,
  ProjectV2Item,
  ProjectV2ItemConnection,
  UpdateProjectV2ItemFieldValuePayload,
} from "@octokit/graphql-schema";
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });

function logFull(data: any) {
  console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));
}

// https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects
// https://docs.github.com/en/graphql/reference/objects#projectv2
// https://docs.github.com/en/graphql/reference/input-objects#projectv2itemorder

// get the first 30 items or the first 30 items starting a cursor
async function getItemsPaginated(
  pageCursor?: string | null
): Promise<{ pageInfo: PageInfo; projectItems: Maybe<ProjectV2Item>[] }> {
  const {
    node: {
      // items: { nodes: projectItems },
      items: { pageInfo, nodes },
    },
  } = await octokit.graphql<{ node: { items: ProjectV2ItemConnection } }>(
    `query($projectId: ID!, $pageCursor: String) {
      node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 30, orderBy: {field: POSITION, direction: DESC}, after: $pageCursor) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
          }
          nodes{
            id
            fieldValues(last: 8) {
              nodes{                
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  id
                  field {
                    ... on ProjectV2FieldCommon {
                      id
                      name
                    }
                  }
                }
              }              
            }
            content{              
              ... on DraftIssue {
                title
                body
              }
              ...on Issue {
                title
                assignees(first: 10) {
                  nodes{
                    login
                  }
                }
              }
              ...on PullRequest {
                title
                assignees(first: 10) {
                  nodes{
                    login
                  }
                }
              }
            }
          }
        }
      }
    }
  }`,
    {
      projectId: process.env.PROJECT_ID,
      pageCursor,
    }
  );

  let projectItems = nodes;

  if (!projectItems) {
    return { pageInfo, projectItems: [] };
  }

  return { projectItems, pageInfo };
}

// returns all items in the project
async function getAllItems() {
  let allItems: Maybe<ProjectV2Item>[] = [];
  let pageInfo: PageInfo = { hasNextPage: true, hasPreviousPage: false, endCursor: "" };

  while (pageInfo.hasNextPage) {
    const { projectItems, pageInfo: newPageInfo } = await getItemsPaginated(pageInfo.endCursor ?? null);
    allItems = allItems.concat(projectItems);
    pageInfo = newPageInfo;
  }

  return allItems;
}

// return details for a single item
async function getSingleItem(itemId: string) {
  const { node: result } = await octokit.graphql<{ node: ProjectV2Item }>(
    `query($itemId: ID!) {
  node(id: $itemId) {
      ... on ProjectV2Item {
        id
        fieldValues(first: 8) {
          nodes{                
            ... on ProjectV2ItemFieldTextValue {
              text
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
            }
            ... on ProjectV2ItemFieldDateValue {
              date
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
            }
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
              field {
                ... on ProjectV2FieldCommon {
                  name
                }
              }
            }
          }              
        }
        content{              
          ... on DraftIssue {
            title
            body
          }
          ...on Issue {
            title
            assignees(first: 10) {
              nodes{
                login
              }
            }
          }
          ...on PullRequest {
            title
            assignees(first: 10) {
              nodes{
                login
              }
            }
          }
        }
      }
    }
  }`,
    {
      itemId,
    }
  );

  return result;
}

// makes a new draft item
async function makeDraftItem(title: string, body: string) {
  const {
    addProjectV2DraftIssue: { projectItem },
  } = await octokit.graphql<{
    addProjectV2DraftIssue: AddProjectV2DraftIssuePayload;
  }>(
    `mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {projectId: $projectId, title: $title, body: $body}) {
        projectItem {
          id
        }
      }
    }`,
    {
      projectId: process.env.PROJECT_ID,
      title,
      body,
    }
  );

  if (!projectItem) {
    throw new Error("projectItem is undefined for new draft item");
  }

  return projectItem.id;
}

// moves an item to a section given an optionId
async function setItemField(id: string, optionId: string = process.env.STATUS_OPTION_ID) {
  const {
    updateProjectV2ItemFieldValue: { projectV2Item },
  } = await octokit.graphql<{
    updateProjectV2ItemFieldValue: UpdateProjectV2ItemFieldValuePayload;
  }>(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { 
            singleSelectOptionId: $optionId
          }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }`,
    {
      projectId: process.env.PROJECT_ID,
      itemId: id,
      fieldId: process.env.STATUS_FIELD_ID,
      optionId,
    }
  );

  if (!projectV2Item) {
    throw new Error("projectItem is undefined for new draft item");
  }

  return projectV2Item.id;
}

///////////////////////////
async function main() {
  try {
    const newItemId = await makeDraftItem("!!! short term task !!!!", "works!");
    logFull(newItemId);

    const returnedUpdateItem = await setItemField(newItemId, process.env.STATUS_OPTION_ID);
    logFull(returnedUpdateItem);

    const grabbedItem = await getSingleItem(newItemId);
    logFull(grabbedItem);

    const items = await getAllItems();
    console.log(`Found ${items.length} items`);
    logFull(items);
  } catch (error) {
    console.error("MAIN ERROR");
    logFull(error);
  }
}

main();
