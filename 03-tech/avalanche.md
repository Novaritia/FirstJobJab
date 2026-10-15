# Avalanche (AVAX)

**Not used — team chose the AI track (2026-10-15).** Kept for reference / stretch goal on the Web3 track. Counts toward *Innovation & ecosystem* (5%).

## Basics
- **C-Chain** is EVM-compatible: Solidity, MetaMask, ethers/viem all work as on Ethereum.
- **Fuji testnet** — use this for the demo.
  - Chain ID: `43113`
  - RPC: `https://api.avax-test.network/ext/bc/C/rpc`
  - Explorer: https://testnet.snowtrace.io
  - Faucet: https://core.app/tools/testnet-faucet/

## Wallets
- Core (Avalanche's wallet) or MetaMask (add Fuji as a custom network).

## Tooling
- Contracts: Solidity + Hardhat or Foundry (or Remix for a single small contract — fastest).
- Frontend: viem + wagmi, or ethers.js.

## Getting started
1. Install a wallet, add Fuji, fund it from the faucet.
2. Write and deploy the contract to Fuji (Remix is fine for a hackathon).
3. Save the address in `.env` and the ABI in `app/`.
4. Verify on Snowtrace so judges can click through.

## Docs
- https://build.avax.network/docs/primary-network
- https://build.avax.network/docs
