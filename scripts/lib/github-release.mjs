export async function githubReleaseExists({
  repo,
  tag,
  token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  fetchImpl = fetch
}) {
  const response = await fetchImpl(
    `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "codex-app-linux-release-check",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to check GitHub release ${repo}@${tag}: ${response.status} ${response.statusText}`
    );
  }

  return true;
}
