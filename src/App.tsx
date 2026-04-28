import { useEffect, useMemo, useState } from "react";
import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Horizon,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import "./App.css";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

// Ví nhận bid trên Stellar Testnet
const AUCTION_WALLET =
  "GBFRFYMZ6J227V7TWQLZOWVEUXWJR5SIR2JYJU6O4YW6EZC454CGBZQZ";

type TxStatus = "idle" | "pending" | "success" | "failed";

type BidHistory = {
  id: number;
  bidder: string;
  amount: string;
  hash: string;
  status: "success" | "failed";
  createdAt: string;
};

type ActivityLog = {
  id: number;
  message: string;
  createdAt: string;
};

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [bidAmount, setBidAmount] = useState("6");
  const [status, setStatus] = useState("Not connected");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState("");
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("Freighter");
  const [secondsLeft, setSecondsLeft] = useState(600);

  const startingPrice = 5;
  const minBidStep = 1;

  const successfulBids = useMemo(
    () => bidHistory.filter((bid) => bid.status === "success"),
    [bidHistory]
  );

  const highestBid = useMemo(() => {
    if (successfulBids.length === 0) {
      return startingPrice;
    }

    return Math.max(...successfulBids.map((bid) => Number(bid.amount)));
  }, [successfulBids]);

  const highestBidder = useMemo(() => {
    if (successfulBids.length === 0) {
      return "No bidder yet";
    }

    const topBid = successfulBids.find(
      (bid) => Number(bid.amount) === highestBid
    );

    return topBid?.bidder || "No bidder yet";
  }, [successfulBids, highestBid]);

  const minimumNextBid = highestBid + minBidStep;

  const auctionEnded = secondsLeft <= 0;

  const countdownText = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, [secondsLeft]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("live-auction-bid-history");
    const savedLogs = localStorage.getItem("live-auction-activity-logs");

    if (savedHistory) {
      setBidHistory(JSON.parse(savedHistory));
    }

    if (savedLogs) {
      setActivityLogs(JSON.parse(savedLogs));
    }
  }, []);

  useEffect(() => {
    if (auctionEnded) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [auctionEnded]);

  function shortAddress(address: string) {
    if (!address || address === "Unknown" || address === "No bidder yet") {
      return address;
    }

    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  function saveBidHistory(newHistory: BidHistory[]) {
    setBidHistory(newHistory);
    localStorage.setItem("live-auction-bid-history", JSON.stringify(newHistory));
  }

  function saveActivityLogs(newLogs: ActivityLog[]) {
    setActivityLogs(newLogs);
    localStorage.setItem("live-auction-activity-logs", JSON.stringify(newLogs));
  }

  function addActivityLog(message: string) {
    const newLog: ActivityLog = {
      id: Date.now(),
      message,
      createdAt: new Date().toLocaleString(),
    };

    const updatedLogs = [newLog, ...activityLogs].slice(0, 8);
    saveActivityLogs(updatedLogs);
  }

  function getCleanBidAmount() {
    return bidAmount.replace(",", ".").trim();
  }

  async function connectWallet() {
    try {
      setTxStatus("pending");
      setStatus("Checking wallet...");

      if (selectedWallet !== "Freighter") {
        setTxStatus("failed");
        setStatus(
          `${selectedWallet} is displayed as a wallet option for Level 2 UI. Please use Freighter for this demo.`
        );
        addActivityLog(`${selectedWallet} selected, but only Freighter is active.`);
        return;
      }

      const connected = await isConnected();

      if (!connected) {
        setTxStatus("failed");
        setStatus("Freighter is not available. Please install Freighter wallet.");
        addActivityLog("Wallet connection failed because Freighter is not available.");
        return;
      }

      const access = await requestAccess();

      if (!access.address) {
        setTxStatus("failed");
        setStatus("Wallet connection rejected.");
        addActivityLog("Wallet connection was rejected.");
        return;
      }

      setPublicKey(access.address);
      setStatus("Wallet connected.");
      setTxStatus("success");
      addActivityLog(`Wallet connected: ${shortAddress(access.address)}`);

      await loadBalance(access.address);
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setStatus("Failed to connect wallet. Please check Freighter.");
      addActivityLog("Wallet connection failed.");
    }
  }

  async function loadBalance(address: string) {
    try {
      const account = await server.loadAccount(address);

      const nativeBalance = account.balances.find(
        (item) => item.asset_type === "native"
      );

      setBalance(nativeBalance?.balance || "0");
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setStatus("Failed to load balance. Please make sure wallet is on Testnet.");
      addActivityLog("Failed to load Testnet XLM balance.");
    }
  }

  async function placeBid() {
    const cleanAmount = getCleanBidAmount();

    try {
      if (auctionEnded) {
        setTxStatus("failed");
        setStatus("Auction has ended.");
        addActivityLog("Bid rejected because auction has ended.");
        return;
      }

      if (!publicKey) {
        setTxStatus("failed");
        setStatus("Please connect wallet first.");
        addActivityLog("Bid rejected because wallet is not connected.");
        return;
      }

      if (!cleanAmount || Number(cleanAmount) <= 0) {
        setTxStatus("failed");
        setStatus("Please enter a valid bid amount.");
        addActivityLog("Bid rejected because amount is invalid.");
        return;
      }

      if (Number(cleanAmount) < minimumNextBid) {
        setTxStatus("failed");
        setStatus(`Your bid must be at least ${minimumNextBid} XLM.`);
        addActivityLog(`Bid rejected. Minimum next bid is ${minimumNextBid} XLM.`);
        return;
      }

      if (Number(cleanAmount) > Number(balance)) {
        setTxStatus("failed");
        setStatus("Insufficient balance.");
        addActivityLog("Bid rejected because balance is insufficient.");
        return;
      }

      setTxHash("");
      setTxStatus("pending");
      setStatus("Creating bid transaction...");
      addActivityLog(`Creating bid transaction for ${cleanAmount} XLM.`);

      const account = await server.loadAccount(publicKey);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: AUCTION_WALLET,
            asset: Asset.native(),
            amount: cleanAmount,
          })
        )
        .setTimeout(60)
        .build();

      setStatus("Waiting for Freighter signature...");
      addActivityLog("Waiting for wallet signature.");

      const signedTransaction = await signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      setStatus("Submitting bid to Stellar Testnet...");
      addActivityLog("Submitting bid transaction to Stellar Testnet.");

      const transactionToSubmit = TransactionBuilder.fromXDR(
        signedTransaction.signedTxXdr,
        Networks.TESTNET
      );

      const result = await server.submitTransaction(transactionToSubmit);

      setTxHash(result.hash);
      setTxStatus("success");
      setStatus("Bid placed successfully.");

      const newBid: BidHistory = {
        id: Date.now(),
        bidder: publicKey,
        amount: cleanAmount,
        hash: result.hash,
        status: "success",
        createdAt: new Date().toLocaleString(),
      };

      saveBidHistory([newBid, ...bidHistory]);
      addActivityLog(`${shortAddress(publicKey)} placed a bid of ${cleanAmount} XLM.`);

      await loadBalance(publicKey);
    } catch (error) {
      console.error(error);
      setTxStatus("failed");
      setStatus("Bid transaction failed or rejected.");

      const failedBid: BidHistory = {
        id: Date.now(),
        bidder: publicKey || "Unknown",
        amount: cleanAmount || "0",
        hash: "N/A",
        status: "failed",
        createdAt: new Date().toLocaleString(),
      };

      saveBidHistory([failedBid, ...bidHistory]);
      addActivityLog("Bid transaction failed or was rejected.");
    }
  }

  function disconnectWallet() {
    addActivityLog("Wallet disconnected.");
    setPublicKey("");
    setBalance("0");
    setTxHash("");
    setTxStatus("idle");
    setStatus("Disconnected.");
  }

  function clearAuctionData() {
    saveBidHistory([]);
    saveActivityLogs([]);
    setTxHash("");
    setBidAmount("6");
    setSecondsLeft(600);
    setStatus("Auction data cleared.");
    setTxStatus("idle");
  }

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <p className="badge">Stellar Testnet Auction</p>
          <p className={`status-pill ${txStatus}`}>{txStatus}</p>
        </div>

        <h1>Stellar Live Auction</h1>

        <p className="description">
          A Level 2 auction demo where users connect wallet, place XLM bids on
          Stellar Testnet, track highest bid, view transaction status, and follow
          auction activity.
        </p>

        <div className="auction-hero">
          <div className="item-image">🎨</div>

          <div className="item-content">
            <p className="label">Auction Item</p>
            <h2>Digital Art Pass #001</h2>
            <p>
              A demo collectible item used to simulate a live bidding experience
              on Stellar Testnet.
            </p>

            <div className={auctionEnded ? "auction-time ended" : "auction-time"}>
              <span>{auctionEnded ? "Auction Ended" : "Time Left"}</span>
              <strong>{countdownText}</strong>
            </div>
          </div>
        </div>

        <div className="auction-stats">
          <div>
            <p>Starting Price</p>
            <strong>{startingPrice} XLM</strong>
          </div>

          <div>
            <p>Highest Bid</p>
            <strong>{highestBid} XLM</strong>
          </div>

          <div>
            <p>Minimum Next Bid</p>
            <strong>{minimumNextBid} XLM</strong>
          </div>

          <div>
            <p>Total Successful Bids</p>
            <strong>{successfulBids.length}</strong>
          </div>
        </div>

        <div className="highest-bidder">
          <p>
            <span>Current Highest Bidder:</span> {shortAddress(highestBidder)}
          </p>
        </div>

        <div className="wallet-options">
          <p className="section-title">Wallet Options</p>

          <div className="wallet-grid">
            {["Freighter", "Albedo", "xBull"].map((wallet) => (
              <button
                key={wallet}
                className={
                  selectedWallet === wallet
                    ? "wallet-option active"
                    : "wallet-option"
                }
                onClick={() => setSelectedWallet(wallet)}
              >
                {wallet}
              </button>
            ))}
          </div>

          <p className="helper-text">
            Freighter is the working wallet for this demo. Albedo and xBull are
            displayed to demonstrate a Level 2 multi-wallet UI.
          </p>
        </div>

        <div className="wallet-box">
          {!publicKey ? (
            <button onClick={connectWallet}>Connect Selected Wallet</button>
          ) : (
            <button onClick={disconnectWallet}>Disconnect Wallet</button>
          )}

          <div className="info">
            <p>
              <span>Wallet:</span>{" "}
              {publicKey ? shortAddress(publicKey) : "Not connected"}
            </p>

            <p>
              <span>Balance:</span> {balance} XLM
            </p>
          </div>
        </div>

        <div className="bid-box">
          <label>Bid Amount</label>

          <input
            type="text"
            value={bidAmount}
            onChange={(event) => setBidAmount(event.target.value)}
            placeholder={`Minimum: ${minimumNextBid} XLM`}
          />

          <button
            onClick={placeBid}
            disabled={!publicKey || txStatus === "pending" || auctionEnded}
          >
            {txStatus === "pending" ? "Processing..." : "Place Bid"}
          </button>

          <p className="helper-text">
            Your bid must be at least {minimumNextBid} XLM and will be submitted
            as a Stellar Testnet payment transaction.
          </p>
        </div>

        <div className="status-box">
          <p>
            <span>Status:</span> {status}
          </p>

          {txHash && (
            <p>
              <span>Transaction Hash:</span>{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}

          <p>
            <span>Auction Wallet:</span> {shortAddress(AUCTION_WALLET)}
          </p>
        </div>

        <div className="contract-box">
          <p className="section-title">Level 2 Contract Section</p>

          <p>
            <span>Contract Status:</span> Frontend ready. Soroban auction
            contract can be deployed in the next step.
          </p>

          <p>
            <span>Contract Address:</span> Pending deployment
          </p>
        </div>

        <div className="grid-two">
          <div className="history-box">
            <div className="history-header">
              <p className="section-title">Bid History</p>
              <button className="secondary-button" onClick={clearAuctionData}>
                Reset
              </button>
            </div>

            {bidHistory.length === 0 ? (
              <p className="helper-text">No bids yet.</p>
            ) : (
              <div className="history-list">
                {bidHistory.map((bid) => (
                  <div className="history-item" key={bid.id}>
                    <p>
                      <span>Bidder:</span> {shortAddress(bid.bidder)}
                    </p>

                    <p>
                      <span>Amount:</span> {bid.amount} XLM
                    </p>

                    <p>
                      <span>Status:</span> {bid.status}
                    </p>

                    <p>
                      <span>Time:</span> {bid.createdAt}
                    </p>

                    {bid.hash !== "N/A" && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${bid.hash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Stellar Expert
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="activity-box">
            <p className="section-title">Auction Activity</p>

            {activityLogs.length === 0 ? (
              <p className="helper-text">No activity yet.</p>
            ) : (
              <div className="activity-list">
                {activityLogs.map((log) => (
                  <div className="activity-item" key={log.id}>
                    <p>{log.message}</p>
                    <span>{log.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;