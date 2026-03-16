import "../styles/globals.css";
import Layout from "../components/Layout";
import { StoreProvider } from "../lib/store";
import { WalletProvider } from "../lib/walletStore";

export default function App({ Component, pageProps }) {
  return (
    <StoreProvider>
      <WalletProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </WalletProvider>
    </StoreProvider>
  );
}
