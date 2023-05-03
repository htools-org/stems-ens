import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import StemsLogo from '@/public/stems-logo.png';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useRouter();
  const requiresWallet = pathname.startsWith('/ens');
  return (
    <div className='flex flex-col flex-wrap min-h-screen bg-stems-light-gray'>
      <header className='relative flex flex-wrap items-center justify-center flex-shrink-0 gap-2 p-4 bg-stems-dark-green'>
        {/* <h1 className='text-3xl font-bold text-white'>
          <Link href='/'>Stems</Link>
        </h1> */}
        <Link href='/'>
          <Image src={StemsLogo} alt='Stems' priority className='w-auto h-12' />
        </Link>
        {requiresWallet ? (
          <div className='flex justify-center w-full lg:absolute lg:right-4 lg:w-fit'>
            <ConnectButton showBalance={true} />
          </div>
        ) : null}
      </header>

      <main className='flex-grow pb-10'>{children}</main>
    </div>
  );
}
