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

## Screenshot :
<img width="766" height="620" alt="auction_overview_stats" src="https://github.com/user-attachments/assets/cbd93a3f-1494-40a0-8f3e-8c5094c80a4c" />

<img width="712" height="528" alt="wallet_options_connected_balance" src="https://github.com/user-attachments/assets/4517585f-cc30-4720-982a-3fd5f371c94a" />

<img width="714" height="498" alt="bid_success_history_activity" src="https://github.com/user-attachments/assets/93c61aa5-f905-4111-b339-eacffb467d48" />



## Tech Stack

- React
- TypeScript
- Vite
- Stellar SDK
- Freighter API
- Soroban / Stellar Smart Contract
- Stellar Testnet

