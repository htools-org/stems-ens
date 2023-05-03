import InstructionBox from '@/components/instruction-box';
import Link from 'next/link';

export default function Home() {
  return (
    <div className='flex flex-col items-center self-center justify-center max-w-md mx-auto mt-16 text-stems-dark-blue'>
      {/* Heading */}
      <h2 className='text-3xl font-bold text-center'>
        Use sovereign domains
        <br />
        as handles on Stems Social
      </h2>

      {/* Main Box */}
      <div className='min-w-full p-4 mt-12 space-y-2 bg-white border border-gray-300 rounded-2xl'>
        <Link
          href='#'
          className='block w-full p-4 font-semibold text-center text-white cursor-not-allowed rounded-2xl bg-stems-light-green'
        >
          HNS (coming soon)
        </Link>
        <Link
          href='/ens/verify'
          className='block w-full p-4 font-semibold text-center text-white bg-stems-dark-green rounded-2xl'
        >
          ENS 🡒
        </Link>
      </div>

      {/* Instructions */}
      <div className='w-full mt-10'>
        <InstructionBox>
          <div className='space-y-4'>
            <p>
              🌱 <span className='font-bold'>Stems Social</span> is an
              independent, experimental Bluesky server supporting HNS + ENS
              domains as handles. This is not an official Bluesky server.
            </p>
            <p>
              🌱 Stems uses custom resolution to showcase sovereign and secure
              digital identities.{' '}
              <span className='font-medium'>
                We make no guarantees regarding the ability to federate with
                other servers.
              </span>
            </p>
            <p>
              🌱 Project by{' '}
              <span className='font-medium'>
                <a href='https://theshake.xyz' target='_blank' rel='noopener'>
                  The Shake
                </a>{' '}
                +{' '}
                <a href='https://blek.ga' target='_blank' rel='noopener'>
                  Rithvik Vibhu
                </a>
              </span>
            </p>
          </div>
        </InstructionBox>
      </div>
    </div>
  );
}
