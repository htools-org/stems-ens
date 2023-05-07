import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Address, useAccount, useContractRead, useSignMessage } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { namehash } from 'ethers/lib/utils.js';
import { useNetwork } from 'wagmi';
import dynamic from 'next/dynamic';
import { SiweMessage } from 'siwe';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InstructionBox from '@/components/instruction-box';

const { ENSRegistry } = require('@ensdomains/ens-contracts');

type EnsThing = {
  chainId: number | undefined;
  id: string | null;
  owner: `0x${string}` | undefined;
  registry: {
    isLoading: boolean;
    isSuccess: boolean;
  };
} | null;

type Invite = {
  code: string;
  fresh: boolean;
} | null;

const SUBGRAPH_URL_BY_CHAIN_ID: Record<number, string> = {
  1: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  5: 'https://api.thegraph.com/subgraphs/name/ensdomains/ensgoerli',
};

function useEnsThing(name: string): EnsThing {
  let id = null;
  try {
    id = namehash(name);
  } catch (error) {}

  const { chain } = useNetwork();
  const ensRegistry = chain?.contracts?.ensRegistry;

  const registryRead = useContractRead({
    address: ensRegistry?.address,
    abi: ENSRegistry,
    functionName: 'owner',
    args: [id],
    enabled: !!id,
  });

  if (name.endsWith('.eth')) {
    return {
      id,
      chainId: chain?.id,
      owner: registryRead.data as Address | undefined,
      registry: {
        isLoading: registryRead.isLoading,
        isSuccess: registryRead.isSuccess,
      },
    };
  }

  return null;
}

function useDomainsByAddress(address: string | undefined): {
  domains: string[] | undefined;
  domainsIsSuccess: boolean;
} {
  const { chain } = useNetwork();
  const domainsQuery = useQuery({
    queryKey: ['domains', address],
    queryFn: async () => {
      if (!address) return undefined;

      const response = await fetch(SUBGRAPH_URL_BY_CHAIN_ID[chain?.id || 0], {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
        body: `{"query":"{  account(id: \\"${address.toLowerCase()}\\") {    id    domains {id name}    wrappedDomains {id name}  }}"}`,
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const json = await response.json();
      if (!json?.data?.account) return null;
      return [...json.data.account.domains, ...json.data.account.wrappedDomains]
        .map((d: any) => d.name as string)
        .filter(
          (domain) => domain.endsWith('.eth') && domain.split('.').length <= 2
        ); // only *.eth, no subdomains
    },
    retry: false,
    placeholderData: undefined,
  });

  return {
    domains: domainsQuery.isLoading ? undefined : domainsQuery.data || [],
    domainsIsSuccess: domainsQuery.isSuccess,
  };
}

function isNullAddress(address: Address | undefined) {
  return !address || address === '0x0000000000000000000000000000000000000000';
}

function CurrentOwner({
  name,
  ensThing,
  ownDomains,
}: {
  name: string;
  ensThing: EnsThing;
  ownDomains: string[] | undefined;
}) {
  if (!ensThing || !ownDomains) {
    return '';
  }

  if (ensThing.registry.isLoading) {
    return '» current owner: loading...';
  }

  if (!ensThing.registry.isSuccess) {
    return '» Cannot read current owner.';
  }

  if (isNullAddress(ensThing.owner)) {
    return '» This domain has no owner.';
  }

  if (!ownDomains.includes(name)) {
    return '» Connected wallet does not own this domain.';
  }

  return '» current owner: you!';
}

function InviteBox({ invite }: { invite: Invite }) {
  if (!invite) return null;

  return (
    <div>
      <p className='font-bold'>
        <span className='text-stems-dark-green'>Verified!</span> Your personal
        invite code is:
      </p>
      <span className='font-mono select-all'>{invite.code}</span>
      {invite.fresh ? null : (
        <blockquote className='pl-2 mt-2 text-sm border-l-2 border-stems-dark-green'>
          This domain or owner has claimed an invite before. The code may not be
          valid anymore.
        </blockquote>
      )}
    </div>
  );
}

function VerifyENS() {
  const [name, setName] = useState('');
  const [ack, setAck] = useState(false);
  const [verifyIsLoading, setVerifyIsLoading] = useState(false);
  const [invite, setInvite] = useState<Invite>(null);

  const account = useAccount();
  const { domains: ownDomains } = useDomainsByAddress(account.address);

  const ensThing = useEnsThing(name);

  const canVerify =
    (!ensThing?.registry.isLoading &&
      ensThing?.registry.isSuccess &&
      !verifyIsLoading &&
      ack &&
      !isNullAddress(ensThing?.owner) &&
      ownDomains?.includes(name)) ||
    false;

  // Nonce
  const [nonce, setNonce] = useState<string | null>(null);
  const fetchNonce = async () => {
    try {
      setNonce(null);
      const nonceRes = await fetch('/api/ens/nonce');
      const nonce = await nonceRes.text();
      setNonce(nonce);
    } catch (error) {
      console.error(error);
      setNonce(null);
    }
  };
  useEffect(() => {
    fetchNonce();
  }, []);

  // Verify and get code
  const { signMessageAsync } = useSignMessage();
  const verify = async () => {
    setInvite(null);
    try {
      const chainId = ensThing?.chainId;
      const address = account.address;
      if (!chainId || !address || !nonce || isNullAddress(address)) return;

      setVerifyIsLoading(true);
      // Create SIWE message with pre-fetched nonce and sign with wallet
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: `Sign in with account ${address} and prove ownership of ${name}.`,
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Get invite
      const getInviteRes = await fetch('/api/ens/get-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature, name }),
      });
      if (!getInviteRes.ok) {
        throw new Error((await getInviteRes.json()).error as string);
      }
      const data = await getInviteRes.json();
      setInvite({ code: data.inviteCode, fresh: data.fresh });
      toast.success('Verified!');
    } catch (error) {
      toast.error('Error: ' + (error as any).message);
    } finally {
      setVerifyIsLoading(false);
      fetchNonce();
    }
  };

  return (
    <div className='flex flex-col items-center self-center justify-center max-w-md mx-auto mt-16 text-stems-dark-blue'>
      {/* Heading */}
      <h2 className='text-3xl font-bold text-center'>
        Verify ENS domain
        <br />
        to receive an invite code
      </h2>

      {/* Main Box */}
      <div className='min-w-full p-4 mt-12 bg-white border border-gray-300 rounded-2xl'>
        <label className='flex items-center gap-4 px-4 py-2 rounded-md bg-stems-light-blue'>
          <span className='font-bold'>ENS Domain</span>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.currentTarget.value.toLowerCase())}
            placeholder='example.eth'
            className='flex-grow p-2 bg-stems-light-blue outline-stems-dark-green'
          />
        </label>

        <div className='px-4 text-sm'>
          {/* @ts-ignore */}
          <CurrentOwner
            name={name}
            ensThing={ensThing}
            ownDomains={ownDomains}
          />
        </div>

        <label className='flex items-center mt-4 text-sm'>
          <input
            type='checkbox'
            className='w-4 h-4'
            checked={ack}
            onChange={(e) => setAck(e.currentTarget.checked)}
          />
          <span className='pl-2'>
            I understand that Stems is not the official Bluesky server.
          </span>
        </label>

        <button
          onClick={verify}
          className='w-full p-4 mt-4 font-semibold text-white bg-stems-dark-green rounded-2xl disabled:bg-stems-light-green disabled:cursor-not-allowed'
          disabled={!canVerify}
        >
          {ensThing?.registry.isLoading ? 'loading...' : 'Verify Domain'}
        </button>
      </div>

      <div className='self-start px-4 mt-4'>
        <InviteBox invite={invite} />
      </div>

      {/* Instructions */}
      <div className='w-full mt-10'>
        <InstructionBox>
          <>
            <h4 className='font-bold'>How do I join Stems?</h4>
            <ol className='ml-1 leading-6 list-decimal list-inside'>
              <li>
                Get an ENS domain{' '}
                <a
                  href='https://app.ens.domains/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline'
                >
                  here
                </a>
              </li>
              <li>Verify domain above for invite code</li>
              <li>
                Go to Bluesky on{' '}
                <a
                  href='https://staging.bsky.app'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline'
                >
                  desktop
                </a>
                ,{' '}
                <a
                  href='https://apps.apple.com/us/app/bluesky-social/id6444370199'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline'
                >
                  iOS
                </a>
                , or{' '}
                <a
                  href='https://play.google.com/store/apps/details?id=xyz.blueskyweb.app'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline'
                >
                  Android
                </a>
              </li>
              <li>
                Select host{' '}
                <span className='font-mono select-all'>
                  https://stems.social
                </span>
              </li>
              <li>Enter invite code</li>
            </ol>

            <h4 className='mt-4 font-bold'>
              How do I use my ENS domain as a handle?
            </h4>
            <ol className='ml-1 leading-6 list-decimal list-inside'>
              <li>Setting &gt; Change Handle &gt; My own domain</li>
              <li>Enter domain to retrieve TXT record</li>
              <li>Set TXT Record at the link below</li>
            </ol>

            <Link
              href='/ens/set-record'
              className='block w-full p-4 mt-4 font-semibold text-center text-white bg-stems-dark-green rounded-2xl'
            >
              Set TXT Record
            </Link>
          </>
        </InstructionBox>
      </div>

      {/* <pre>
        {JSON.stringify(
          {
            invite,
            ensThing,
          },
          null,
          2
        )}
      </pre> */}
    </div>
  );
}

export default dynamic(() => Promise.resolve(VerifyENS), {
  ssr: false,
});
