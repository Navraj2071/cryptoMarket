import "../styles/globals.css";

import { DAppProvider, ChainId } from "@usedapp/core";

const config = {
  multicallAddresses: { 1: "Ethereum Mainnet", 4: "Network Rinkeby" },
  networks: [ChainId.Rinkeby, ChainId.Mainnet],
};

function MyApp({ Component, pageProps }) {
  return (
    <DAppProvider config={config}>
      <Component {...pageProps} />
    </DAppProvider>
  );
}

export default MyApp;
