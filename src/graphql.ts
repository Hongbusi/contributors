import { Octokit } from 'octokit'
import ora from 'ora'
import chalk from 'chalk'

interface Repository {
  name: string
  defaultBranchRef: {
    name: string
  }
}

interface SearchResponse {
  search: {
    repositoryCount: number
    edges: Record<'node', Repository>[]
  }
}

interface SearchResultRepository {
  name: string
  defaultBranch: string
}

interface SearchResult {
  repositoryCount: number
  repositories: SearchResultRepository[]
}

interface RepositoryCommit {
  oid: string
  author: {
    avatarUrl: string
    email: string
    name: string
  }
}

interface RepositoryResponse {
  repository: {
    object: {
      history: {
        nodes: RepositoryCommit[]
        pageInfo: {
          hasNextPage: boolean
          endCursor: string
        }
      }
    }
  }
}

const octokit = new Octokit({
  // auth: process.env.GITHUB_TOKEN
  auth: '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'
})

const searchRepositories = async (name: string): Promise<SearchResult> => {
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
  let { repositoryCount, edges } = (await octokit.graphql<SearchResponse>(query)).search

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

const fetchCommits = async (owner: string, name: string, branch: string, after: undefined | string) => {
  const query = `{
    repository(owner: "${owner}", name: "${name}") {
      object(expression: "${branch}") {
        ... on Commit {
          history${after ? `(after: "${after}")` : ''} {
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
  const response = (await octokit.graphql<RepositoryResponse>(query)).repository.object.history
  return response
}

export async function getOrganizationContributors(name: string) {
  const spinner = ora(chalk.green(`Searching for top 100 repositories in ${name}...`)).start()

  const { repositoryCount, repositories } = await searchRepositories(name)

  spinner.succeed(chalk.green(`${repositoryCount} repositories found.`))

  spinner.start('Fetching contributors...')

  const map: Record<string, any> = {}

  do {
    const repository = repositories.shift() as SearchResultRepository
    spinner.text = `Fetching ${repository.name} contributors... (${repositoryCount - repositories.length}/${repositoryCount})`

    let endCursor
    do {
      const result = await fetchCommits(name, repository.name, repository.defaultBranch, endCursor)

      result.nodes
        .filter(i => i.author.email)
        .forEach((i) => {
          const { author: { email, avatarUrl, name } } = i
          if (!map[name]) {
            map[email] = {
              avatarUrl,
              name,
              count: 0
            }
          }
          map[email].count++
        })

      endCursor = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : undefined
    } while (endCursor)
  } while (repositories.length > 0)

  spinner.succeed(chalk.green('Fetched contributors success.'))

  return Object.values(map).sort((a, b) => b.count - a.count)
}

getOrganizationContributors('developer-plus')
