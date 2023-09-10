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
import type { GraphQlQueryResponseData } from "@octokit/graphql";
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });

function logFull(data: GraphQlQueryResponseData) {
  console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));
}

// https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects
// https://docs.github.com/en/graphql/reference/objects#projectv2
// https://docs.github.com/en/graphql/reference/input-objects#projectv2itemorder

// returns first 3 items in the project
async function getItems() {
  const stuff: GraphQlQueryResponseData = await octokit.graphql(
    `query($projectId: ID!) {
  node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 3, orderBy: {field: POSITION, direction: DESC}) {
          nodes{
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
    }
  );

  return stuff;
}

// return details for a single item
async function getSingleItem(itemId: string) {
  const stuff: GraphQlQueryResponseData = await octokit.graphql(
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

  return stuff;
}

// makes a new draft item
async function makeDraftItem(title: string, body: string) {
  const stuff: GraphQlQueryResponseData = await octokit.graphql(
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

  return stuff;
}

// moves an item to the "ideaspace" column
async function setItemFieldToIdeaspace(id: string) {
  const stuff: GraphQlQueryResponseData = await octokit.graphql(
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
      optionId: process.env.STATUS_OPTION_ID,
    }
  );

  return stuff;
}

///////////////////////////

async function main() {
  try {
    const newItemId = await makeDraftItem("new ideaspace item graphql", "works!");

    const returnedUpdateItem = await setItemFieldToIdeaspace(newItemId.addProjectV2DraftIssue.projectItem.id);
    logFull(returnedUpdateItem);

    const grabbedItem = await getSingleItem(newItemId.addProjectV2DraftIssue.projectItem.id);
    logFull(grabbedItem);

    const items = await getItems();
    logFull(items);
  } catch (error) {
    console.error("MAIN ERROR");
    console.error(error);
  }
}

main();
