import dotenv from "dotenv";
dotenv.config();

import { Octokit } from "octokit";

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });

// Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
async function main() {
  const { data } = await octokit.rest.users.getAuthenticated();

  return data;
}

main().then(console.log);
