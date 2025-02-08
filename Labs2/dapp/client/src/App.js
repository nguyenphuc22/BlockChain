import React, { useState, useEffect } from 'react';
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
const MULTISIG_ADDRESS = '0xa08f3517Ee859b286bE99ea651724CB8BF04a31C'; // Paste deployed contract address here

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [owners, setOwners] = useState([]);
  const [transactions, setTransactions] = useState([]);
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

          window.ethereum.on('accountsChanged', (accounts) => {
            setAccount(accounts[0]);
          });
        } catch (error) {
          console.error('Error connecting to MetaMask:', error);
        }
      } else {
        console.error('Please install MetaMask!');
      }
    };

    initWeb3();
  }, []);

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
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">MultiSig Wallet</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Account: {account}</h2>
          <h3 className="text-lg mb-2">Owners:</h3>
          <ul className="list-disc pl-6">
            {owners.map((owner, index) => (
                <li key={index}>{owner}</li>
            ))}
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Submit New Transaction</h2>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div>
              <input
                  type="text"
                  value={newTx.to}
                  onChange={(e) => setNewTx({ ...newTx, to: e.target.value })}
                  placeholder="To Address"
                  className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <input
                  type="text"
                  value={newTx.value}
                  onChange={(e) => setNewTx({ ...newTx, value: e.target.value })}
                  placeholder="Value (ETH)"
                  className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <input
                  type="text"
                  value={newTx.data}
                  onChange={(e) => setNewTx({ ...newTx, data: e.target.value })}
                  placeholder="Data (hex)"
                  className="w-full p-2 border rounded"
              />
            </div>
            <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Submit Transaction
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Transactions</h2>
          <div className="space-y-4">
            {transactions.map((tx) => (
                <div key={tx.id} className="border p-4 rounded">
                  <p>ID: {tx.id}</p>
                  <p>To: {tx.to}</p>
                  <p>Value: {web3?.utils.fromWei(tx.value, 'ether')} ETH</p>
                  <p>Approvals: {tx.numApprovals}</p>
                  <p>Executed: {tx.executed ? 'Yes' : 'No'}</p>

                  {!tx.executed && (
                      <div className="mt-2 space-x-2">
                        <button
                            onClick={() => handleApprove(tx.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                            onClick={() => handleExecute(tx.id)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                          Execute
                        </button>
                        <button
                            onClick={() => handleRevoke(tx.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                          Revoke
                        </button>
                      </div>
                  )}
                </div>
            ))}
          </div>
        </div>
      </div>
  );
}

export default App;