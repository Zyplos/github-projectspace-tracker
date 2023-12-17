import { Octokit } from "octokit";
import type {
  AddProjectV2DraftIssuePayload,
  Maybe,
  PageInfo,
  ProjectV2Item,
  ProjectV2ItemConnection,
  ProjectV2ItemFieldValue,
  UpdateProjectV2ItemFieldValuePayload,
} from "@octokit/graphql-schema";
import { ProjectV2ItemFieldSingleSelectValue } from "@octokit/graphql-schema";
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });
import config from "./config";

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
                  optionId
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
                assignees(first: 10) {
                  nodes{
                    login
                  }
                }
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
      projectId: config.projectNodeId,
      pageCursor,
    }
  );

  let projectItems = nodes;

  if (!projectItems) {
    return { pageInfo, projectItems: [] };
  }

  return { projectItems, pageInfo };
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
            assignees(first: 10) {
              nodes{
                login
              }
            }
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

// makes a new draft item, returns id of a new item
export async function makeDraftItem(title: string, body: string) {
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
      projectId: config.projectNodeId,
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
// by default it will add items to the ideaspace section
// returns the id of the edited item
export async function setItemField(id: string, optionId: string) {
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
      projectId: config.projectNodeId,
      itemId: id,
      fieldId: config.statusFieldNodeId,
      optionId,
    }
  );

  if (!projectV2Item) {
    throw new Error("projectItem is undefined for new draft item");
  }

  return projectV2Item.id;
}

export class ProjectInstance {
  allItems: ProjectV2Item[];

  constructor() {
    this.allItems = [];
  }

  // returns all items in the project
  async getAllItems() {
    let allItems: Maybe<ProjectV2Item>[] = [];
    let pageInfo: PageInfo = { hasNextPage: true, hasPreviousPage: false, endCursor: "" };

    while (pageInfo.hasNextPage) {
      const { projectItems, pageInfo: newPageInfo } = await getItemsPaginated(pageInfo.endCursor ?? null);
      allItems = allItems.concat(projectItems);
      pageInfo = newPageInfo;
    }

    const allItemsReal = allItems.filter((item) => item !== null) as ProjectV2Item[];

    this.allItems = allItemsReal;
  }

  // count all ideaspace items
  getItemsByLabel(labelId: string) {
    const filteredItems = [];
    for (const item of this.allItems) {
      const itemFields = item.fieldValues.nodes as ProjectV2ItemFieldValue[];

      // find items for our detailed summary
      const itemIsInStatus = itemFields.some((field: any) => {
        return field?.optionId === labelId;
      });

      if (itemIsInStatus) {
        filteredItems.push(item);
      }
    }

    return filteredItems;
  }
}
