import type { HackerNewsReference } from "../lockfile/types.js";

interface HnHit {
  title?: string;
  url?: string;
  created_at?: string;
}

interface HnSearchResponse {
  hits?: HnHit[];
}

const cache = new Map<string, HackerNewsReference[]>();

export async function lookupHackerNews(
  packageName: string,
  version: string,
): Promise<HackerNewsReference[]> {
  const cacheKey = `${packageName}@${version}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const query = encodeURIComponent(`${packageName} ${version} security npm`);
  const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      cache.set(cacheKey, []);
      return [];
    }

    const data = (await response.json()) as HnSearchResponse;
    const references = (data.hits ?? [])
      .filter((hit) => hit.title && hit.url)
      .map((hit) => ({
        title: hit.title!,
        url: hit.url!,
        date: hit.created_at?.slice(0, 10) ?? "",
      }));

    cache.set(cacheKey, references);
    return references;
  } catch {
    cache.set(cacheKey, []);
    return [];
  }
}

export function clearHackerNewsCache(): void {
  cache.clear();
}
