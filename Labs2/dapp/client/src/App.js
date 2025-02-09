import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Wallet, Send, Users, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import Web3 from 'web3';

const MULTISIG_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_txId",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_owners",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "_required",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "txId",
        "type": "uint256"
      }
    ],
    "name": "Approve",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_txId",
        "type": "uint256"
      }
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "txId",
        "type": "uint256"
      }
    ],
    "name": "Execute",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_txId",
        "type": "uint256"
      }
    ],
    "name": "revoke",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "txId",
        "type": "uint256"
      }
    ],
    "name": "Revoke",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "_data",
        "type": "bytes"
      }
    ],
    "name": "submit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "txId",
        "type": "uint256"
      }
    ],
    "name": "Submit",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "approved",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOwners",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_txId",
        "type": "uint256"
      }
    ],
    "name": "getTransaction",
    "outputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "executed",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "numApprovals",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTransactionCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isOwner",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "owners",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "required",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "transactions",
    "outputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "executed",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "numApprovals",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
const MULTISIG_ADDRESS = '0xa08f3517Ee859b286bE99ea651724CB8BF04a31C';

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

  const loadTransactions = async (contractInstance) => {
    const count = await contractInstance.methods.getTransactionCount().call();
    const txs = [];
    for (let i = 0; i < count; i++) {
      const tx = await contractInstance.methods.getTransaction(i).call();
      txs.push({ id: i, ...tx });
    }
    setTransactions(txs);
    await loadWalletBalance(web3);
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (contract && account) {
      try {
        await contract.methods
            .submit(newTx.to, web3.utils.toWei(newTx.value, 'ether'), newTx.data)
            .send({ from: account });
        await loadTransactions(contract);
        setNewTx({ to: '', value: '', data: '' });
      } catch (error) {
        console.error('Error submitting transaction:', error);
      }
    }
  };

  const handleApprove = async (txId) => {
    if (contract && account) {
      try {
        await contract.methods.approve(txId).send({ from: account });
        await loadTransactions(contract);
      } catch (error) {
        console.error('Error approving transaction:', error);
      }
    }
  };

  const handleExecute = async (txId) => {
    if (contract && account) {
      try {
        await contract.methods.execute(txId).send({ from: account });
        await loadTransactions(contract);
      } catch (error) {
        console.error('Error executing transaction:', error);
      }
    }
  };

  const handleRevoke = async (txId) => {
    if (contract && account) {
      try {
        await contract.methods.revoke(txId).send({ from: account });
        await loadTransactions(contract);
      } catch (error) {
        console.error('Error revoking approval:', error);
      }
    }
  };

  return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                MultiSig Wallet Dashboard
              </CardTitle>
              <CardDescription>
                Current Account: {account}
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
                    <Badge key={index} variant={owner === account ? "default" : "secondary"}>
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
                      placeholder="To Address"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                      type="text"
                      value={newTx.value}
                      onChange={(e) => setNewTx({ ...newTx, value: e.target.value })}
                      placeholder="Value (ETH)"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                      type="text"
                      value={newTx.data}
                      onChange={(e) => setNewTx({ ...newTx, data: e.target.value })}
                      placeholder="Data (hex)"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Submit Transaction
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
                {transactions.map((tx) => (
                    <Card key={tx.id} className="bg-gray-50">
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Transaction #{tx.id}</CardTitle>
                          {tx.executed ? (
                              <Badge variant="success" className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Executed
                              </Badge>
                          ) : (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <XCircle className="h-4 w-4" />
                                Pending
                              </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">To Address</p>
                            <p className="font-mono">{tx.to}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Value</p>
                            <p className="font-mono">{web3?.utils.fromWei(tx.value, 'ether')} ETH</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-500">Approvals</p>
                          <p className="font-mono">{tx.numApprovals} signatures</p>
                        </div>
                      </CardContent>
                      {!tx.executed && (
                          <CardFooter className="p-4 flex gap-2">
                            <Button onClick={() => handleApprove(tx.id)} variant="outline">
                              Approve
                            </Button>
                            <Button onClick={() => handleExecute(tx.id)} variant="default">
                              Execute
                            </Button>
                            <Button onClick={() => handleRevoke(tx.id)} variant="destructive">
                              Revoke
                            </Button>
                          </CardFooter>
                      )}
                    </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default App;