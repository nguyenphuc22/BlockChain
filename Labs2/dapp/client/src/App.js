import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription } from "./components/ui/alert";
import {
  Wallet,
  Send,
  Users,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  AlertTriangle,
  AlertOctagon,
  UserPlus,
  UserMinus
} from 'lucide-react';
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
  const [required, setRequired] = useState(0);
  const [threshold, setThreshold] = useState('0');
  const [newThreshold, setNewThreshold] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newTx, setNewTx] = useState({
    to: '',
    value: '',
    data: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [extendTxId, setExtendTxId] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [cancelTxId, setCancelTxId] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [removeOwnerAddress, setRemoveOwnerAddress] = useState('');

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

          // Load threshold
          const currentThreshold = await contractInstance.methods.getThreshold().call();
          setThreshold(web3Instance.utils.fromWei(currentThreshold, 'ether'));

          // Load required signatures
          const requiredSignatures = await contractInstance.methods.required().call();
          setRequired(Number(requiredSignatures));

          // Check if current user is admin
          const owners = await contractInstance.methods.getOwners().call();
          setIsAdmin(accounts[0].toLowerCase() === owners[0].toLowerCase());

          // Load other data
          await loadOwners(contractInstance);
          await loadTransactions(contractInstance);
          await loadWalletBalance(web3Instance);

          window.ethereum.on('accountsChanged', handleAccountChange);
        } catch (error) {
          console.error('Error connecting to MetaMask:', error);
          setError('Failed to connect to MetaMask');
        }
      } else {
        setError('Please install MetaMask');
      }
    };

    initWeb3();
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
      }
    };
  }, []);

  const handleUpdateThreshold = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const thresholdWei = web3.utils.toWei(newThreshold, 'ether');
      await contract.methods.updateThreshold(thresholdWei).send({ from: account });
      setThreshold(newThreshold);
      setNewThreshold('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handlePause = async () => {
    try {
      await contract.methods.pauseContract().send({ from: account });
      setIsPaused(true);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUnpause = async () => {
    try {
      await contract.methods.unpauseContract().send({ from: account });
      setIsPaused(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleExtendDeadline = async (txId, newDeadline) => {
    try {
      await contract.methods.extendDeadline(txId, newDeadline).send({ from: account });
      await loadTransactions(contract);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCancel = async (txId) => {
    try {
      await contract.methods.cancelTransaction(txId).send({ from: account });
      await loadTransactions(contract);
    } catch (error) {
      setError(error.message);
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
    const isSmallAmount = web3.utils.fromWei(tx.value, 'ether') < threshold;
    const canInteract = !tx.executed && !isExpired && !isSmallAmount;

    // Format time remaining
    const formatTimeRemaining = () => {
      if (!tx.deadline) return "No deadline";
      const timeLeft = tx.deadline - now;
      if (timeLeft <= 0) return "Expired";
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return `${minutes}m ${seconds}s`;
    };

    const getStatusBadge = () => {
      if (tx.executed) {
        return (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Executed
            </Badge>
        );
      } else if (isExpired) {
        return (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              Expired
            </Badge>
        );
      } else if (isSmallAmount) {
        return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <RefreshCcw className="h-4 w-4" />
              Auto-approved
            </Badge>
        );
      } else {
        return (
            <Badge variant="default" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTimeRemaining()}
            </Badge>
        );
      }
    };

    return (
        <Card className="bg-gray-50 hover:bg-gray-100 transition-colors">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Transaction #{tx.id}</CardTitle>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={tx.numApprovals >= required ? "success" : "secondary"}>
                  {tx.numApprovals}/{required} Signatures
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Recipient Address</p>
                <p className="font-mono text-sm truncate">{tx.to}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Value</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono">{web3.utils.fromWei(tx.value, 'ether')} ETH</p>
                  {isSmallAmount && (
                      <Badge variant="outline" className="text-xs">
                        Below Threshold
                      </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm">
                  {isSmallAmount ? (
                      "Small transaction - No approvals needed"
                  ) : (
                      `Requires ${required} approvals`
                  )}
                </p>
              </div>

              {tx.data && tx.data !== '0x' && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Transaction Data</p>
                    <p className="font-mono text-sm break-all">{tx.data}</p>
                  </div>
              )}
            </div>
          </CardContent>

          {canInteract && (
              <CardFooter className="p-4 flex flex-wrap gap-2">
                <Button
                    onClick={() => handleApprove(tx.id)}
                    variant="outline"
                    disabled={isLoading || isSmallAmount}
                    className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isLoading ? 'Approving...' : 'Approve'}
                </Button>

                <Button
                    onClick={() => handleExecute(tx.id)}
                    variant="default"
                    disabled={isLoading || (tx.numApprovals < required && !isSmallAmount)}
                    className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isLoading ? 'Executing...' : 'Execute'}
                </Button>

                <Button
                    onClick={() => handleRevoke(tx.id)}
                    variant="destructive"
                    disabled={isLoading || isSmallAmount}
                    className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {isLoading ? 'Revoking...' : 'Revoke'}
                </Button>
              </CardFooter>
          )}

          {!canInteract && tx.executed && (
              <CardFooter className="p-4">
                <p className="text-sm text-gray-500">
                  Transaction has been executed successfully
                </p>
              </CardFooter>
          )}

          {!canInteract && isExpired && !tx.executed && (
              <CardFooter className="p-4">
                <p className="text-sm text-gray-500">
                  Transaction has expired and cannot be executed
                </p>
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
                  <p className="text-2xl font-bold">{required}/{owners.length}</p>
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

          {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    Emergency Controls
                  </CardTitle>
                  <CardDescription>
                    Advanced controls for emergency situations - Admin only
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Deadline Extension */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Extend Transaction Deadline</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                              type="number"
                              placeholder="Transaction ID"
                              value={extendTxId}
                              onChange={(e) => setExtendTxId(e.target.value)}
                          />
                          <Input
                              type="datetime-local"
                              value={newDeadline}
                              onChange={(e) => setNewDeadline(e.target.value)}
                          />
                          <Button
                              onClick={() => handleExtendDeadline(extendTxId, Math.floor(new Date(newDeadline).getTime() / 1000))}
                              className="flex items-center gap-2"
                          >
                            <Clock className="h-4 w-4" />
                            Extend Deadline
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Threshold Update */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Update Threshold</h3>
                      <div className="flex items-center gap-4">
                        <Input
                            type="number"
                            step="0.000000000000000001"
                            value={newThreshold}
                            onChange={(e) => setNewThreshold(e.target.value)}
                            placeholder="New threshold value (ETH)"
                        />
                        <Button
                            onClick={handleUpdateThreshold}
                            className="flex items-center gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Update Threshold
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Current threshold: {threshold} ETH
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

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
                        <TransactionCard
                            key={tx.id}
                            tx={tx}
                            required={required}
                            web3={web3}
                            threshold={threshold}
                            isLoading={isLoading}
                            handleApprove={handleApprove}
                            handleExecute={handleExecute}
                            handleRevoke={handleRevoke}
                        />
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