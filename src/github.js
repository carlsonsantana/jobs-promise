const datetime = require('node-datetime');
const fetch = require('node-fetch');

const DATE_FORMAT_STRING = 'Y-m-dT00:00:00Z';
const DATE_TODAY_STRING = datetime.create().format(DATE_FORMAT_STRING);
const DATE_TODAY = datetime.create(DATE_TODAY_STRING);

function getURLFromRepository({owner, repo}, date) {
  return `https://api.github.com/repos/${owner}/${repo}/issues?since=${date}`;
}

function convertResponseToJSON(response) {
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json();
}

function filterIssues(issuesJSON) {
  return issuesJSON.filter((issueJSON) => !issueJSON.pull_request);
}

function convertGitHubJSONToJobs(issuesJSON) {
  return issuesJSON.map(({title, body, html_url, created_at}) => {
    return {
      title,
      description: body,
      url: html_url,
      publishedAt: new Date(datetime.create(created_at).getTime())
    };
  });
}

function filterJobs(date) {
  return (jobs) => jobs.filter((job) => {
    return (
      (job.publishedAt.getTime() > date.getTime())
      && (job.publishedAt.getTime() < DATE_TODAY.getTime())
    );
  });
}

function getJobsPromiseFromGitHub(repositories, date) {
  const promises = [];

  repositories.forEach((repository) => promises.push(
    fetch(getURLFromRepository(repository, date.toISOString())).then(
      convertResponseToJSON
    ).then(filterIssues).then(convertGitHubJSONToJobs).then(filterJobs(date))
  ));

  return Promise.all(promises);
}

function getJobsPromise(repositories, date) {
  return getJobsPromiseFromGitHub(repositories, date).then(
    (jobs) => jobs.flat()
  );
}

module.exports = getJobsPromise;
