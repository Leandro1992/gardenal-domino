import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo-icon.png" />
        <meta name="theme-color" content="#0F3B75" />
        <meta name="description" content="Sistema de gerenciamento de partidas de dominó do Gardenal" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
