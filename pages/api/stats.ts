import db from '@/utils/api/db';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const key = req.query.key as string | undefined;

  if (!key || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const invitesIssued = await db
    .selectFrom('invites')
    .select('chain_id')
    .select(db.fn.countAll<number>().as('invites_count'))
    .groupBy('chain_id')
    .execute();

  const maxLimit = process.env.MAX_INVITES
    ? parseInt(process.env.MAX_INVITES)
    : 0;

  const remaining =
    maxLimit -
    (invitesIssued.find((row) => row.chain_id === 1)?.invites_count ?? 0);

  res.json({ maxLimit, remaining, invitesIssued });
  return;
}
