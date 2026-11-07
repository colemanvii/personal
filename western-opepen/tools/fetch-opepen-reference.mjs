// Verbatim from the Opepen agents directive (opepen-app public/agents.md, snapshot 2026-11-07),
// output path changed. Needs api.opepen.art allowed in this environment network policy.
// run from western-opepen/:  node tools/fetch-opepen-reference.mjs
import { mkdir, writeFile } from 'node:fs/promises'

const API = 'https://api.opepen.art/v1'
const EDITIONS = [1, 4, 5, 10, 20, 40]
const MAX_PAGES = 2
const groups = [
  ['public-unrevealed', '-published_at'],
  ['demand', '-submission_stats.demand.total'],
  ['revealed', '-reveals_at'],
]
const records = new Map()

for (const [status, sort] of groups) {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const query = new URLSearchParams({ status, sort, limit: '20', page: String(page) })
    const source = `${API}/set-submissions?${query}`
    const response = await fetch(source, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}; Retry-After: ${response.headers.get('retry-after')}`,
      )
    }
    const { data, meta } = await response.json()
    if (!Array.isArray(data) || !Number.isInteger(Number(meta?.last_page))) {
      throw new Error('Unexpected pagination response; inspect it before continuing')
    }
    for (const s of data) {
      const observation = { source, fetched_at: new Date().toISOString() }
      if (records.has(s.uuid)) {
        records.get(s.uuid).observations.push(observation)
        continue
      }
      records.set(s.uuid, {
        uuid: s.uuid,
        url: `https://opepen.art/submissions/${s.uuid}`,
        name: s.name,
        artist: s.artist,
        creator: s.creator,
        creator_name: s.creatorAccount?.display ?? null,
        co_creators: (s.coCreators ?? []).map((c) => ({
          address: c.account?.address ?? c.address ?? null,
          name: c.account?.display ?? null,
        })),
        description: s.description,
        edition_type: s.edition_type,
        published_at: s.published_at,
        starred_at: s.starred_at,
        archived_at: s.archived_at,
        set_id: s.set_id,
        reveals_at: s.reveals_at,
        demand: s.submission_stats?.demand ?? null,
        observations: [observation],
        base_media: EDITIONS.map((edition) => {
          const media = s[`edition${edition}Image`]
          return {
            edition,
            title: s[`edition${edition}Name`],
            uuid: media?.uuid ?? null,
            type: media?.type ?? null,
            original_url: media
              ? `${media.cdn}/${media.path}/${media.uuid}.${media.type}`
              : null,
            preview_url: media ? `${API}/opepen/images/${media.uuid}/render` : null,
          }
        }),
      })
    }
    if (!data.length || page >= Number(meta.last_page)) break
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

await mkdir('research/reference', { recursive: true })
await writeFile(
  'research/reference/opepen-reference.jsonl',
  [...records.values()].map((record) => JSON.stringify(record)).join('\n') + '\n',
)
console.log(
  `Saved ${records.size} unique references; inspect artwork before drawing conclusions.`,
)
