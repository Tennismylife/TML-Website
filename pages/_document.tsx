import Document, { Html, Head, Main, NextScript } from 'next/document';

// Minimal custom Document to satisfy Next.js prerendering needs (404/_error)
export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
