import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

// Contract ABI - Bạn sẽ lấy cái này sau khi compile contract
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newAge",
        "type": "uint256"
      }
    ],
    "name": "AgeChanged",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "multiplier",
        "type": "uint256"
      }
    ],
    "name": "multiplyAge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_age",
        "type": "uint256"
      }
    ],
    "name": "setAge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAge",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]; // Thay thế bằng ABI thực tế
const CONTRACT_ADDRESS = '0xa039160a8E7134c6071912AD523364718f866eB2'; // Thay thế bằng địa chỉ contract sau khi deploy

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [age, setAge] = useState(0);
  const [newAge, setNewAge] = useState('');
  const [multiplier, setMultiplier] = useState('');

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
              CONTRACT_ABI,
              CONTRACT_ADDRESS
          );
          setContract(contractInstance);

          window.ethereum.on('accountsChanged', (accounts) => {
            setAccount(accounts[0]);
          });
        } catch (error) {
          console.error('Lỗi khi kết nối với MetaMask:', error);
        }
      } else {
        console.error('Vui lòng cài đặt MetaMask!');
      }
    };

    initWeb3();
  }, []);

  const updateAge = async () => {
    if (contract) {
      const currentAge = await contract.methods.getAge().call();
      setAge(currentAge);
    }
  };

  const handleSetAge = async (e) => {
    e.preventDefault();
    if (contract && account) {
      try {
        await contract.methods.setAge(newAge).send({ from: account });
        await updateAge();
        setNewAge('');
      } catch (error) {
        console.error('Lỗi khi set age:', error);
      }
    }
  };

  const handleMultiplyAge = async (e) => {
    e.preventDefault();
    if (contract && account) {
      try {
        await contract.methods.multiplyAge(multiplier).send({ from: account });
        await updateAge();
        setMultiplier('');
      } catch (error) {
        console.error('Lỗi khi nhân age:', error);
      }
    }
  };

  return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Age dApp</h1>

          <div style={{ marginBottom: '20px' }}>
            <p>Tài khoản: {account}</p>
            <p>Age hiện tại: {age}</p>
          </div>

          <form onSubmit={handleSetAge} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                  type="number"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  placeholder="Nhập age mới"
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    width: '200px'
                  }}
              />
              <button
                  type="submit"
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
              >
                Set Age
              </button>
            </div>
          </form>

          <form onSubmit={handleMultiplyAge}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  placeholder="Nhập số nhân"
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    width: '200px'
                  }}
              />
              <button
                  type="submit"
                  style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
              >
                Nhân Age
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

export default App;