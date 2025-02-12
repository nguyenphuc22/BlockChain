import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Wallet, Send, Users, RefreshCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import Web3 from 'web3';
import { MULTISIG_ABI, MULTISIG_ADDRESS } from './constants/multisig';

const DEADLINE_DURATION = 2 * 60; // 2 minutes in seconds

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [owners, setOwners] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState('0');
  const [newTx, setNewTx] = useState({
    to: '',
    value: '',
    data: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          const accounts = await web3Instance.eth.getAccounts();
          setAccount(accounts[0]);

          const contractInstance = new web3Instance.eth.Contract(
              MULTISIG_ABI,
              MULTISIG_ADDRESS
          );
          setContract(contractInstance);

          // Load initial data
          await loadOwners(contractInstance);
          await loadTransactions(contractInstance);
          await loadWalletBalance(web3Instance);

          window.ethereum.on('accountsChanged', handleAccountChange);
        } catch (error) {
          console.error('Error connecting to MetaMask:', error);
        }
      }
    };

    initWeb3();
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTransactions(prevTxs => [...prevTxs]); // Force re-render to update countdowns
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!web3.utils.isAddress(newTx.to)) {
        throw new Error('Invalid recipient address');
      }

      const balance = await web3.eth.getBalance(MULTISIG_ADDRESS);
      if (web3.utils.toWei(newTx.value, 'ether') > balance) {
        throw new Error('Insufficient wallet balance');
      }

      // Set deadline to 5 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + (DEADLINE_DURATION);

      await contract.methods
          .submit(
              newTx.to,
              web3.utils.toWei(newTx.value, 'ether'),
              newTx.data || '0x',
              deadline
          )
          .send({ from: account });

      setNewTx({ to: '', value: '', data: '' });
      await loadTransactions(contract);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = async (accounts) => {
    setAccount(accounts[0]);
    if (contract) {
      await loadTransactions(contract);
    }
  };

  const loadWalletBalance = async (web3Instance) => {
    const balance = await web3Instance.eth.getBalance(MULTISIG_ADDRESS);
    setWalletBalance(web3Instance.utils.fromWei(balance, 'ether'));
  };

  const loadOwners = async (contractInstance) => {
    const ownersList = await contractInstance.methods.getOwners().call();
    setOwners(ownersList);
  };

  const handleApprove = async (txId) => {
    setIsLoading(true);
    setError(null);
    try {
      await contract.methods.approve(txId).send({ from: account });
      await loadTransactions(contract);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (txId) => {
    setIsLoading(true);
    setError(null);
    try {
      await contract.methods.execute(txId).send({ from: account });
      await loadTransactions(contract);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (txId) => {
    setIsLoading(true);
    setError(null);
    try {
      await contract.methods.revoke(txId).send({ from: account });
      await loadTransactions(contract);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (contractInstance) => {
    const count = await contractInstance.methods.getTransactionCount().call();
    const txs = [];

    for (let i = 0; i < count; i++) {
      const tx = await contractInstance.methods.getTransaction(i).call();
      txs.push({
        id: i,
        ...tx,
        deadline: Number(tx.deadline) // Assuming deadline is returned from contract
      });
    }

    setTransactions(txs);
  };

  const TransactionCard = ({ tx }) => {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = tx.deadline && tx.deadline < now;
    const canInteract = !tx.executed && !isExpired;

    // Format time remaining
    const formatTimeRemaining = () => {
      if (!tx.deadline) return "No deadline";
      const timeLeft = tx.deadline - now;
      if (timeLeft <= 0) return "Expired";

      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return `${minutes}m ${seconds}s`;
    };

    return (
        <Card key={tx.id} className="bg-gray-50">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Transaction #{tx.id}</CardTitle>
              <div className="flex gap-2">
                {tx.executed ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Executed
                    </Badge>
                ) : isExpired ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Expired
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeRemaining()}
                    </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">To Address</p>
                <p className="font-mono text-sm truncate">{tx.to}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Value</p>
                <p className="font-mono">{web3?.utils.fromWei(tx.value, 'ether')} ETH</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Approvals Status</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono">{tx.numApprovals} / 2 signatures</p>
                  <Badge variant={tx.numApprovals >= 2 ? "success" : "secondary"}>
                    {tx.numApprovals >= 2 ? "Ready" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
          {canInteract && (
              <CardFooter className="p-4 flex gap-2">
                <Button
                    onClick={() => handleApprove(tx.id)}
                    variant="outline"
                    disabled={isLoading}
                >
                  {isLoading ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                    onClick={() => handleExecute(tx.id)}
                    variant="default"
                    disabled={isLoading || tx.numApprovals < 2}
                >
                  {isLoading ? 'Executing...' : 'Execute'}
                </Button>
                <Button
                    onClick={() => handleRevoke(tx.id)}
                    variant="destructive"
                    disabled={isLoading}
                >
                  {isLoading ? 'Revoking...' : 'Revoke'}
                </Button>
              </CardFooter>
          )}
        </Card>
    );
  };

  return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Error Alert */}
          {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                MultiSig Wallet Dashboard
              </CardTitle>
              <CardDescription>
                Current Account: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-600">Wallet Balance</h3>
                  <p className="text-2xl font-bold">{walletBalance} ETH</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-600">Total Transactions</h3>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-600">Required Signatures</h3>
                  <p className="text-2xl font-bold">2/3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owners Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                Wallet Owners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {owners.map((owner, index) => (
                    <Badge
                        key={index}
                        variant={owner.toLowerCase() === account.toLowerCase() ? "default" : "secondary"}
                    >
                      {owner.slice(0, 6)}...{owner.slice(-4)}
                    </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* New Transaction Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-6 w-6" />
                Submit New Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTransaction} className="space-y-4">
                <div className="space-y-2">
                  <Input
                      type="text"
                      value={newTx.to}
                      onChange={(e) => setNewTx({ ...newTx, to: e.target.value })}
                      placeholder="To Address (0x...)"
                      disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                      type="number"
                      step="0.000000000000000001"
                      value={newTx.value}
                      onChange={(e) => setNewTx({ ...newTx, value: e.target.value })}
                      placeholder="Value (ETH)"
                      disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                      type="text"
                      value={newTx.data}
                      onChange={(e) => setNewTx({ ...newTx, data: e.target.value })}
                      placeholder="Data (hex) - Optional"
                      disabled={isLoading}
                  />
                </div>
                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit Transaction'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCcw className="h-6 w-6" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No transactions found
                    </div>
                ) : (
                    transactions.map((tx) => (
                        <TransactionCard key={tx.id} tx={tx} />
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default App;