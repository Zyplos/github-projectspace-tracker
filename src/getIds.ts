import dotenv from "dotenv";
dotenv.config();
import util from "util";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_PERSONAL_TOKEN: string;
      GITHUB_ORGANIZATION: string;
      PROJECT_NUMBER: string;
    }
  }
}

// check that all env variables are set
if (!process.env.GITHUB_PERSONAL_TOKEN || !process.env.GITHUB_ORGANIZATION || !process.env.PROJECT_NUMBER) {
  throw new Error(
    "Please make sure you have set the GITHUB_PERSONAL_TOKEN, GITHUB_ORGANIZATION and PROJECT_NUMBER env variables."
  );
}

import { Octokit } from "octokit";
import type { GraphQlQueryResponseData } from "@octokit/graphql";

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });

async function getProjectId() {
  const responseData: GraphQlQueryResponseData = await octokit.graphql(
    `query($organizationName: String!, $projectNumber: Int!) {
      organization(login: $organizationName){
        projectV2(number: $projectNumber) {
          id
        }
      }
    }`,
    {
      organizationName: process.env.GITHUB_ORGANIZATION,
      projectNumber: parseInt(process.env.PROJECT_NUMBER),
    }
  );

  return responseData;
}

async function getLabels() {
  const stuff: GraphQlQueryResponseData = await octokit.graphql(
    `query($organizationName: String!, $projectNumber: Int!) {
      organization(login: $organizationName){
        projectV2(number: $projectNumber) {
          id,
          title,
          updatedAt,
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }`,
    {
      organizationName: process.env.GITHUB_ORGANIZATION,
      projectNumber: parseInt(process.env.PROJECT_NUMBER),
    }
  );

  return stuff;
}

getProjectId()
  .then((data) => console.log(`Project ID: ${data.organization.projectV2.id}`))
  .catch((err) => {
    console.error("Error getting project ID", err);
  });

getLabels()
  .then((data) => {
    const fields = data.organization.projectV2.fields.nodes;
    // find field with name == "Status"
    const statusField = fields.find((field: GraphQlQueryResponseData) => field.name === "Status");
    console.log(util.inspect(statusField, { showHidden: false, depth: null, colors: true }));
  })
  .catch((err) => {
    console.error("Error getting labels", err);
  });
