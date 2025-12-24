import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" type="image/x-icon" href="/logo.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo-icon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo-icon.png" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="description" content="Sistema de gerenciamento de partidas de dominó do Gardenal" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
