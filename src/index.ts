import dotenv from "dotenv";
dotenv.config();

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_PERSONAL_TOKEN: string;
      GITHUB_ORGANIZATION: string;
      PROJECT_ID: string;
    }
  }
}

import { Octokit } from "octokit";
import type { GraphQlQueryResponseData } from "@octokit/graphql";

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });

// Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
async function main() {
  const stuff: GraphQlQueryResponseData = await octokit.graphql(
    `query($organizationName: String!, $projectId: Int!) {
      organization(login: $organizationName){
        projectV2(number: $projectId) {
          id,
          title,
          updatedAt,
          url
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    startDate
                    id
                  }
                }
              }
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
      projectId: parseInt(process.env.PROJECT_ID),
    }
  );

  return stuff;
}

main().then(console.log);
