import { Octokit } from 'octokit'
import ora from 'ora'
import chalk from 'chalk'
import consola from 'consola'

interface Repository {
  name: string
  defaultBranchRef: {
    name: string
  }
}

interface GraphQLResponse {
  search: {
    repositoryCount: number
    edges: Record<'node', Repository>[]
  }
}

const octokit = new Octokit({
  // auth: process.env.GITHUB_TOKEN
  auth: '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'
})

const searchRepositories = async (name: string) => {
  const query = `{
    search(query: "user:${name}", type: REPOSITORY, first: 100) {
      repositoryCount
      edges {
        node {
          ... on Repository {
            name
            defaultBranchRef {
              name
            }
          }
        }
      }
    }
  }`

  // eslint-disable-next-line prefer-const
  let { repositoryCount, edges } = (await octokit.graphql<GraphQLResponse>(query)).search

  const repositories = edges.filter((i) => {
    if (!i.node.defaultBranchRef) {
      repositoryCount--
      return false
    }
    return true
  }).map(i => ({ name: i.node.name, defaultBranch: i.node.defaultBranchRef.name }))

  return {
    repositoryCount,
    repositories
  }
}

const fetchCommits = async (owner: string, name: string, branch: string) => {
  const query = `{
    repository(owner: "${owner}", name: "${name}") {
      object(expression: "${branch}") {
        ... on Commit {
          history {
            nodes {
              oid
              author {
                avatarUrl
                email
                name
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  }`

  const response = (await octokit.graphql(query)).repository.object
}

export async function getOrganizationContributors(name: string) {
  const spinner = ora(chalk.green(`Searching for top 100 repositories in ${name}...`)).start()

  const { repositoryCount, repositories } = await searchRepositories(name)

  spinner.succeed(chalk.green(`${repositoryCount} repositories found.`))

  spinner.start('Fetching contributors...')

  do {
    const repository = repositories.shift()
    spinner.text = `Fetching ${repository.name} contributors... (${repositoryCount - repositories.length}/${repositoryCount})`
    await fetchCommits(name, repository.name, repository.defaultBranch)
  } while (repositories.length > 0)

  spinner.succeed(chalk.green('Fetched contributors success.'))
}

getOrganizationContributors('developer-plus')
