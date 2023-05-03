import { useState } from 'react';
import c from 'classnames';
import { useDebounce } from 'usehooks-ts';
import {
  Address,
  useContractRead,
  useContractWrite,
  useEnsResolver,
  usePrepareContractWrite,
  useWaitForTransaction,
} from 'wagmi';
import type {
  RefetchOptions,
  RefetchQueryFilters,
} from '@tanstack/react-query';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { keccak256, namehash } from 'ethers/lib/utils.js';
import { packName } from 'bns/lib/encoding';
import { types as recordTypes } from 'bns/lib/constants';
import bnsUtil from 'bns/lib/util';
import wire from 'bns/lib/wire';
const bio = require('bufio');
const { PublicResolver } = require('@ensdomains/ens-contracts');

function hashDnsName(fqdnName: string) {
  const DNSName = packName(fqdnName);
  return keccak256(DNSName);
}

type EnsThing = {
  node: string | null;
  resolver: {
    hasResolver: boolean;
    isLoading: boolean;
    isSuccess: boolean;
    address: Address;
  };
  dnsRecords: {
    recordRaw:
      | (unknown[] & {
          [x: string]: unknown;
        })
      | undefined;
    records: any[] | null;
    isLoading: boolean;
    isSuccess: boolean;
    refetch: <TPageData>(
      options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
    ) => Promise<unknown>;
  };
} | null;

function useEnsThing(
  name: string,
  recordName: string,
  recordType: number
): EnsThing {
  // ENS node name
  const fqdnName = bnsUtil.fqdn(name);
  const strippedName = bnsUtil.trimFQDN(fqdnName);

  // DNS name
  // name . domain
  const fqdnRecordName =
    (recordName ? bnsUtil.fqdn(recordName) : '') + fqdnName;

  let hashedRecordName = null;
  try {
    hashedRecordName = hashDnsName(fqdnRecordName);
  } catch (error) {
    console.error(error);
  }

  let node = null;
  try {
    node = namehash(strippedName);
  } catch (error) {}

  const resolver = useEnsResolver({ name: strippedName });

  const resolverRead = useContractRead({
    address: resolver.data?.address as Address | undefined,
    abi: PublicResolver,
    functionName: 'dnsRecord',
    args: [node, hashedRecordName, recordType],
  });

  let records = null;
  if (resolverRead.isSuccess) {
    try {
      const data = Buffer.from((resolverRead.data as any).slice(2), 'hex'); // strip 0x
      const br = new bio.BufferReader(data);
      const rrset = [];

      while (br.left()) {
        rrset.push(wire.Record.read(br));
      }
      records = rrset; // set only if no error
    } catch (error) {
      console.error(error);
    }
  }

  if (strippedName.endsWith('.eth')) {
    return {
      node,
      resolver: {
        hasResolver: !!resolver.data,
        address: resolver.data?.address as Address,
        isLoading: resolver.isLoading,
        isSuccess: resolver.isSuccess,
      },
      dnsRecords: {
        recordRaw: resolverRead.data,
        records,
        isLoading: resolverRead.isLoading,
        isSuccess: resolverRead.isSuccess,
        refetch: resolverRead.refetch,
      },
    };
  }

  return null;
}

function CurrentValue({ ensThing }: { ensThing: EnsThing }) {
  if (!ensThing) {
    return '';
  }
  if (ensThing.resolver.isLoading || ensThing.dnsRecords.isLoading) {
    return '» current value: loading...';
  }

  if (ensThing.resolver.isSuccess && !ensThing.resolver.hasResolver) {
    return '» No resolver set for this domain.';
  }

  if (!ensThing.dnsRecords.isSuccess || !ensThing.dnsRecords.records) {
    return '» Cannot read current value.';
  }

  if (!ensThing.dnsRecords.records.length) {
    return '» current value: record not set.';
  }

  return (
    <span>
      » current value:{' '}
      {ensThing.dnsRecords.records.map((r) => r.data.toString()).join(',')}
    </span>
  );
}

export default function SetRecordENS() {
  const [name, setName] = useState('');
  const [recordName, setRecordName] = useState('');
  const [recordValue, setRecordValue] = useState('');

  const ensThing = useEnsThing(name, recordName, recordTypes.TXT);

  // ENS node name
  const fqdnName = bnsUtil.fqdn(name);
  const strippedName = bnsUtil.trimFQDN(fqdnName);

  // DNS name
  // name . domain
  const fqdnRecordName =
    (recordName ? bnsUtil.fqdn(recordName) : '') + fqdnName;
  let newRecord = undefined;
  let newRecordError = undefined;
  try {
    if (recordValue) {
      newRecord = wire.Record.fromString(
        `${fqdnRecordName} TXT ${recordValue}`
      );
    }
  } catch (error) {
    newRecordError = (error as any).message;
  }

  // Setting new record
  const debouncedNewRecoord = useDebounce(newRecord, 200);
  const { config: setDNSRecordsConfig } = usePrepareContractWrite({
    address: ensThing?.resolver.address,
    abi: PublicResolver,
    functionName: 'setDNSRecords',
    args: [
      ensThing?.node || undefined,
      debouncedNewRecoord
        ? '0x' + debouncedNewRecoord?.encode().toString('hex')
        : undefined,
    ],
    enabled: !!debouncedNewRecoord,
  });
  const setDNSRecordsWrite = useContractWrite(setDNSRecordsConfig);
  const setDNSRecordsWait = useWaitForTransaction({
    hash: setDNSRecordsWrite.data?.hash,
    onSettled(data, err) {
      ensThing?.dnsRecords.refetch();
    },
    onSuccess(data) {
      toast.success('TXT record updated!');
    },
    onError(err) {
      setRecordValue('');
      toast.error('Error: ' + err.message);
    },
  });

  const canWrite =
    (ensThing?.resolver.hasResolver &&
      !!newRecord &&
      setDNSRecordsWrite.write &&
      !setDNSRecordsWrite.isLoading &&
      !setDNSRecordsWait.isLoading) ||
    false;

  return (
    <div className='flex flex-col items-center self-center justify-center max-w-md mx-auto mt-16 text-stems-dark-blue'>
      {/* Heading */}
      <h2 className='text-3xl font-bold text-center'>
        Set TXT Records
        <br />
        on your ENS domain
      </h2>

      {/* Main Box */}
      <div className='min-w-full p-4 mt-12 bg-white border border-gray-300 rounded-2xl'>
        {/* Domain */}
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

        <h4 className='mt-4 font-bold text-center'>TXT Record</h4>

        {/* Record Name */}
        <label className='flex items-baseline gap-4 px-4 py-2 mt-2 rounded-md bg-stems-light-blue'>
          <span className='font-bold'>Host</span>
          <input
            type='text'
            value={recordName}
            onChange={(e) => setRecordName(e.currentTarget.value.toLowerCase())}
            placeholder='_atproto'
            className='flex-grow w-full p-2 bg-stems-light-blue outline-stems-dark-green'
          />
          <p className='flex-shrink-0 max-w-6'>{name ? `.${name}` : ''}</p>
        </label>

        <div className='px-4 text-sm'>
          {/* @ts-ignore */}
          <CurrentValue ensThing={ensThing} />
        </div>

        {/* Record Value */}
        <label className='flex items-baseline gap-4 px-4 py-2 mt-2 rounded-md bg-stems-light-blue'>
          <span className='font-bold'>Value</span>
          <input
            type='text'
            value={recordValue}
            onChange={(e) => setRecordValue(e.currentTarget.value)}
            placeholder='did=did:plc:...'
            className='flex-grow w-full p-2 bg-stems-light-blue outline-stems-dark-green'
          />
        </label>

        <div className='px-4 text-sm text-red-700'>{newRecordError}</div>

        <button
          onClick={() => setDNSRecordsWrite.write?.()}
          className={c(
            'w-full p-4 mt-4 font-semibold text-white bg-stems-dark-green rounded-2xl',
            {
              'bg-stems-light-green cursor-not-allowed':
                !setDNSRecordsWrite.write || !canWrite,
            }
          )}
          disabled={!setDNSRecordsWrite.write || !canWrite}
        >
          {ensThing?.resolver.isLoading || ensThing?.dnsRecords.isLoading
            ? 'loading...'
            : setDNSRecordsWait.isLoading
            ? 'setting new record...'
            : 'Set TXT Record'}
        </button>
      </div>

      {/* <div className='w-full overflow-x-auto'>
        <pre className='max-w-full break-all'>
          {JSON.stringify(
            {
              setDNSRecordsWrite: {
                isLoading: setDNSRecordsWrite.isLoading,
                isSuccess: setDNSRecordsWrite.isSuccess,
                data: setDNSRecordsWrite.data,
                error: setDNSRecordsWrite.error,
              },
              setDNSRecordsWait: {
                isLoading: setDNSRecordsWait.isLoading,
                isSuccess: setDNSRecordsWait.isSuccess,
                // data: setDNSRecordsWait.data,
                error: setDNSRecordsWait.error,
              },
              ensThing,
            },
            null,
            2
          )}
        </pre>
      </div> */}
    </div>
  );
}
