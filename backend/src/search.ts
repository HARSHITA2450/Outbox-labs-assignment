import { Client } from '@elastic/elasticsearch';
import { config } from './config';

const es = new Client({ node: config.esUrl });
const index = 'emails';

export async function initSearch() {
  try {
    if (!(await es.indices.exists({ index }))) await es.indices.create({ index });
  } catch (e) {
    console.warn('[search] Elasticsearch unavailable:', (e as Error).message);
  }
}

export interface EmailDoc {
  id: string; user_id: number; to_email: string; subject: string; body: string;
  status: string; scheduled_at: string | Date; sent_at?: string | Date | null;
}

export async function indexEmails(docs: EmailDoc[]) {
  if (!docs.length) return;
  try {
    await es.bulk({
      operations: docs.flatMap((d) => [{ index: { _index: index, _id: d.id } }, {
        id: d.id, user_id: d.user_id, to_email: d.to_email, subject: d.subject, body: d.body,
        status: d.status, scheduled_at: d.scheduled_at, sent_at: d.sent_at ?? null,
      }]),
    });
  } catch (e) {
    console.warn('[search] index failed:', (e as Error).message);
  }
}

export async function updateEmailDoc(id: string, doc: Partial<EmailDoc>) {
  try {
    await es.update({ index, id, doc, doc_as_upsert: true });
  } catch (e) {
    console.warn('[search] update failed:', (e as Error).message);
  }
}

export async function searchEmails(userId: number, q: string) {
  const res = await es.search({
    index, size: 100, sort: [{ scheduled_at: { order: 'desc', unmapped_type: 'date' } }],
    query: {
      bool: {
        filter: [{ term: { user_id: userId } }],
        must: q ? [{ multi_match: { query: q, fields: ['to_email', 'subject', 'body'], fuzziness: 'AUTO' } }] : [{ match_all: {} }],
      },
    },
  });
  return res.hits.hits.map((h) => h._source);
}
