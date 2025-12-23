import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { Toaster } from '@/components/ui/toaster';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  if (isLoginPage) {
    return (
      <>
        <Component {...pageProps} />
        <Toaster />
      </>
    );
  }

  return (
    <Layout>
      <Component {...pageProps} />
      <Toaster />
    </Layout>
  );
}
