// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId);

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numApprovals;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public required; // Số chữ ký cần thiết

    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public approved;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint _txId) {
        require(_txId < transactions.length, "tx does not exist");
        _;
    }

    modifier notApproved(uint _txId) {
        require(!approved[_txId][msg.sender], "tx already approved");
        _;
    }

    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "tx already executed");
        _;
    }

    constructor(address[] memory _owners, uint _required) {
        require(_owners.length > 0, "owners required");
        require(_required > 0 && _required <= _owners.length, "invalid required number of owners");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submit(address _to, uint _value, bytes calldata _data)
    external
    onlyOwner
    {
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numApprovals: 0
        }));

        emit Submit(transactions.length - 1);
    }

    function approve(uint _txId)
    external
    onlyOwner
    txExists(_txId)
    notApproved(_txId)
    notExecuted(_txId)
    {
        approved[_txId][msg.sender] = true;
        transactions[_txId].numApprovals += 1;

        emit Approve(msg.sender, _txId);
    }

    function execute(uint _txId)
    external
    txExists(_txId)
    notExecuted(_txId)
    {
        require(transactions[_txId].numApprovals >= required, "approvals < required");
        Transaction storage transaction = transactions[_txId];

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "tx failed");

        emit Execute(_txId);
    }

    function revoke(uint _txId)
    external
    onlyOwner
    txExists(_txId)
    notExecuted(_txId)
    {
        require(approved[_txId][msg.sender], "tx not approved");
        approved[_txId][msg.sender] = false;
        transactions[_txId].numApprovals -= 1;

        emit Revoke(msg.sender, _txId);
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() external view returns (uint) {
        return transactions.length;
    }

    function getTransaction(uint _txId)
    external
    view
    returns (
        address to,
        uint value,
        bytes memory data,
        bool executed,
        uint numApprovals
    )
    {
        Transaction storage transaction = transactions[_txId];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numApprovals
        );
    }
}