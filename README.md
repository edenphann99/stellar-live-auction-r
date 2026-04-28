# Stellar Live Auction

A Level 2 Stellar Testnet auction dApp where users can connect a wallet, place XLM bids, track the highest bid, view transaction status, and see bid history.

## Overview

Stellar Live Auction simulates a simple live auction flow on Stellar Testnet.

Users can connect their Freighter wallet, place a bid using testnet XLM, confirm the transaction in Freighter, and view the transaction hash on Stellar Expert.

## Features

- Connect Freighter wallet
- Display wallet public key
- Display XLM balance
- Wallet options UI: Freighter, Albedo, xBull
- Place bid using Stellar Testnet XLM
- Show transaction status: idle / pending / success / failed
- Show transaction hash
- Track highest bid
- Show minimum next bid
- Countdown timer
- Bid history
- Auction activity log
- Deployed Soroban contract address included

## User Flow

1. Open the dApp
2. Select Freighter wallet
3. Connect wallet
4. View wallet address and XLM balance
5. Enter a bid amount higher than the current highest bid
6. Confirm the transaction in Freighter
7. View transaction status and transaction hash
8. Check bid history and auction activity

## Tech Stack

- React
- TypeScript
- Vite
- Stellar SDK
- Freighter API
- Soroban / Stellar Smart Contract
- Stellar Testnet

## Setup Instructions

Clone the repository:

```bash
git clone YOUR_GITHUB_REPO_LINK