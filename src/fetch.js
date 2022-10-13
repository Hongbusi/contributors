import fetch from 'node-fetch'

async function fetchReposByOrgs(name) {
  const response = await fetch(`https://api.github.com/orgs/${name}/repos`)
  return (await response.json()).map(i => i.full_name)
}

async function fetchContributorsByRepo(name) {
  const response = await fetch(`https://api.github.com/repos/${name}/contributors`)
  return await response.json()
}

async function fetchContributors(name) {
  const repos = await fetchReposByOrgs(name)

  const allFetch = []
  repos.forEach((item) => {
    allFetch.push(fetchContributorsByRepo(item))
  })

  const result = await Promise.all(allFetch)

  const contributors = {}

  result.forEach((i) => {
    i.forEach((j) => {
      contributors[j.id] = { login: j.login, avatar_url: j.avatar_url }
    })
  })

  return Object.values(contributors)
}

// fetchContributors('developer-plus')
