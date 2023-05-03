import { useState } from 'react';
import wire from 'bns/lib/wire';
import { types as recordTypes } from 'bns/lib/constants';

function EncodeRecord() {
  const [name, setName] = useState('bsky-test.eth.');
  const [recordType, setRecordType] = useState('TXT');
  const [recordValue, setRecordValue] = useState('');

  const res = {} as any;
  if (name && recordType && recordValue) {
    res.name = name;
    res.type = recordType;
    res.value = recordValue;

    try {
      res.record = wire.Record.fromString(
        `${name} ${recordType} ${recordValue}`
      );
      res.recordEncoded = res.record.encode().toString('hex');
    } catch (error) {
      res.recordError = error;
    }
  }

  return (
    <div className='flex flex-col items-center justify-center mx-auto text-stems-dark-blue'>
      <h2 className='mb-4 text-2xl font-medium'>Encode</h2>

      <input
        type='text'
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        className='border'
      />
      <select
        value={recordType}
        onChange={(e) => setRecordType(e.currentTarget.value)}
        className='bg-white border'
      >
        {Object.keys(recordTypes).map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        type='text'
        value={recordValue}
        onChange={(e) => setRecordValue(e.currentTarget.value)}
        className='border'
      />

      <div className='overflow-auto'>
        <pre className='break-all'>{JSON.stringify(res, null, 2)}</pre>
      </div>
    </div>
  );
}

function DecodeRecord() {
  const [encodedRecord, setEncodedRecord] = useState('');

  const res = {} as any;
  if (encodedRecord) {
    try {
      res.record = wire.Record.decode(Buffer.from(encodedRecord, 'hex'));
    } catch (error) {
      res.recordError = error;
    }
  }

  return (
    <div className='flex flex-col items-center justify-center mx-auto text-stems-dark-blue'>
      <h2 className='mb-4 text-2xl font-medium'>Decode</h2>

      <textarea
        value={encodedRecord}
        onChange={(e) => setEncodedRecord(e.currentTarget.value)}
        className='border'
        placeholder='hex-encoded record'
      />

      <pre className='break-all'>{JSON.stringify(res, null, 2)}</pre>
    </div>
  );
}

export default function VerifyENS() {
  return (
    <>
      <h2 className='mt-12 text-3xl font-medium text-center'>DNS Record</h2>
      <div className='grid grid-cols-2 mt-8'>
        <EncodeRecord />
        <DecodeRecord />
      </div>
    </>
  );
}
