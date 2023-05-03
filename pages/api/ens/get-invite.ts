import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { SiweMessage } from 'siwe';
import ironOptions from '@/utils/api/iron';
import db from '@/utils/api/db';

type RequestBody = {
  message: string | undefined;
  signature: string | undefined;
  name: string | undefined;
};

const SUBGRAPH_URL_BY_CHAIN_ID: Record<number, string> = {
  1: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  5: 'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli',
};

const MAX_INVITES: number | null = process.env.MAX_INVITES
  ? parseInt(process.env.MAX_INVITES)
  : null;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  switch (method) {
    case 'POST':
      try {
        const { message, signature, name } = req.body as RequestBody;

        // Validate input
        if (!name || !name.endsWith('.eth') || name.toLowerCase() !== name) {
          return res.status(400).json({ error: 'Invalid domain.' });
        }
        if (!message || !signature) {
          return res.status(400).json({ error: 'Invalid siwe data.' });
        }

        // Verify SIWE
        const siweMessage = new SiweMessage(message);
        const { data, success, error } = await siweMessage.verify(
          { signature, nonce: req.session.nonce },
          { suppressExceptions: true }
        ); // TODO: add domain; verify time?
        if (error || !success) {
          if (error) {
            console.error(error);
          }
          return res.status(401).json({ error: 'Invalid signature.' });
        }
        // main, goerli
        if (![1, 5].includes(data.chainId)) {
          return res.status(400).json({ error: 'Chain not supported.' });
        }

        // Verify unused nonce
        const usedNonce = await db
          .selectFrom('nonces')
          .selectAll()
          .where('nonce', '=', data.nonce)
          .executeTakeFirst();
        if (usedNonce) {
          return res
            .status(400)
            .json({ error: 'Nonce re-use. Refresh and try again.' });
        }

        // Invalidate nonce
        await db
          .insertInto('nonces')
          .values({ nonce: data.nonce })
          .executeTakeFirst();

        const address = data.address;

        console.log(data, name);

        // Verify ENS domain and owner
        const response = await fetch(SUBGRAPH_URL_BY_CHAIN_ID[data.chainId], {
          method: 'POST',
          headers: {
            accept: 'application/json',
          },
          body: `{"query":"{  account(id: \\"${address.toLowerCase()}\\") {    id    domains(where: {name: \\"${name}\\"}) {id name}    wrappedDomains(where: {name: \\"${name}\\"}) {id name}  }}"}`,
        });
        const json = await response.json();
        if (!json?.data?.account) {
          return res.status(400).json({ error: 'Account does not exist.' });
        }
        const { domains, wrappedDomains } = json?.data?.account;
        if (!domains.length && !wrappedDomains.length) {
          return res
            .status(400)
            .json({ error: 'Account does own this domain.' });
        }

        // Check existing code
        const existingInvite = await db
          .selectFrom('invites')
          .selectAll()
          .where(({ and, or, cmpr }) =>
            and([
              or([
                cmpr('domain', '=', name),
                cmpr('owner', '=', address.toLowerCase()),
              ]),
              cmpr('chain_id', '=', data.chainId),
            ])
          )
          .executeTakeFirst();
        if (existingInvite) {
          return res.json({
            inviteCode: existingInvite.invite_code,
            fresh: false,
          });
        }

        // Limit access
        if (MAX_INVITES) {
          const totalInvitesIssued = await db
            .selectFrom('invites')
            .select(db.fn.countAll<number>().as('invites_count'))
            .where('chain_id', '=', 1)
            .executeTakeFirstOrThrow();
          if (totalInvitesIssued.invites_count >= MAX_INVITES) {
            return res.status(400).json({
              error: 'Not issuing new invites currently. Try again later.',
            });
          }
        }

        // Get new code (real code only for mainnet)
        let newInviteCode: string | null = null;
        if (data.chainId !== 1) {
          newInviteCode = 'stems-social-fakeinvite';
        } else {
          try {
            const stemsRes = await fetch(
              process.env.PDS_BASE_URL +
                '/xrpc/com.atproto.server.createInviteCode',
              {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                  Authorization:
                    'Basic ' +
                    Buffer.from(
                      'admin:' + process.env.PDS_ADMIN_PASSWORD,
                      'ascii'
                    ).toString('base64'),
                },
                body: JSON.stringify({
                  useCount: 1,
                }),
              }
            );
            const data = await stemsRes.json();
            if (!stemsRes.ok) throw new Error(data.error);
            newInviteCode = data.code as string;
          } catch (error) {
            console.error(error);
            throw new Error('Could not create new invite code.');
          }
        }

        // Store new code
        await db
          .insertInto('invites')
          .values({
            domain: name,
            owner: address.toLowerCase(),
            invite_code: newInviteCode,
            chain_id: data.chainId,
          })
          .execute();

        // Return code
        res.json({ inviteCode: newInviteCode, fresh: true });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ error: 'Unknown error. Try again after a while.' });
      }
      break;
    default:
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
