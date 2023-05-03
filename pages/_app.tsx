import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { mainnet, goerli } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Layout from '@/components/layout';
import { ToastContainer } from 'react-toastify';

const { chains, provider } = configureChains(
  [mainnet, goerli],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Stems ENS',
  projectId: 'd25a4cee91d0e917875c76536b55a1e0',
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider
        chains={chains}
        theme={lightTheme({
          accentColor: '#afc9bc',
          accentColorForeground: 'white',
        })}
      >
        <QueryClientProvider client={queryClient}>
          <Layout>
            <Component {...pageProps} />
            <ToastContainer />
          </Layout>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
