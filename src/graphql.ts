import { Octokit } from 'octokit'

const octokit = new Octokit({
  // auth: process.env.GITHUB_TOKEN
  auth: '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'
})

const fetchRepositories = async (name: string) => {
  const query = `{
    search(query: "user:${name}", type: REPOSITORY, first: 100) {
      repositoryCount
      edges {
        node {
          ... on Repository {
            name
          }
        }
      }
    }
  }`

  const response = (await octokit.graphql(query)).search
  return response
}

export async function getOrganizationContributors(name: string) {

}

fetchRepositories('developer-plus')
