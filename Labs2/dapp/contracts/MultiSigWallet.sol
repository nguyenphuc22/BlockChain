// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiSigWallet {
    // Events
    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId);
    event ThresholdUpdated(uint newThreshold);
    event DeadlineExtended(uint indexed txId, uint newDeadline);

    // Structs
    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numApprovals;
        uint deadline;
    }

    // State Variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public required;
    uint public threshold; // Threshold amount that requires multi-sig
    mapping(uint => uint) public originalDeadlines;

    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public approved;

    // Modifiers
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

    modifier validDeadline(uint _txId) {
        require(block.timestamp <= transactions[_txId].deadline, "transaction expired");
        _;
    }

    // Constructor
    constructor(
        address[] memory _owners,
        uint _required,
        uint _threshold
    ) {
        require(_owners.length > 0, "owners required");
        require(
            _required > 0 && _required <= _owners.length,
            "invalid required number of owners"
        );
        require(_threshold > 0, "threshold must be greater than 0");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
        threshold = _threshold;
    }

    // Receive function
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // Core Functions
    function submit(address _to, uint _value, bytes calldata _data, uint _deadline)
    external
    onlyOwner
    {
        require(_deadline > block.timestamp, "deadline must be in future");

        uint txId = transactions.length;

        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numApprovals: _value < threshold ? 1 : 0,
            deadline: _deadline
        }));

        originalDeadlines[txId] = _deadline;

        // Auto-approve and execute for small transactions
        if (_value < threshold) {
            approved[txId][msg.sender] = true;

            // Execute immediately
            Transaction storage transaction = transactions[txId];
            transaction.executed = true;

            (bool success, ) = transaction.to.call{value: transaction.value}(
                transaction.data
            );
            require(success, "tx failed");

            emit Execute(txId);
        }

        emit Submit(txId);
    }

    function approve(uint _txId)
    external
    onlyOwner
    txExists(_txId)
    notApproved(_txId)
    notExecuted(_txId)
    validDeadline(_txId)
    {
        Transaction storage transaction = transactions[_txId];
        // Only allow approvals for transactions above threshold
        require(transaction.value >= threshold, "approval not required for small amounts");

        approved[_txId][msg.sender] = true;
        transaction.numApprovals += 1;

        emit Approve(msg.sender, _txId);
    }

    function execute(uint _txId)
    external
    txExists(_txId)
    notExecuted(_txId)
    validDeadline(_txId)
    {
        Transaction storage transaction = transactions[_txId];
        uint requiredApprovals = transaction.value >= threshold ? required : 1;
        require(
            transaction.numApprovals >= requiredApprovals,
            "approvals < required"
        );

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
        Transaction storage transaction = transactions[_txId];
        require(transaction.value >= threshold, "revoke not allowed for small amounts");
        require(approved[_txId][msg.sender], "tx not approved");

        approved[_txId][msg.sender] = false;
        transaction.numApprovals -= 1;

        emit Revoke(msg.sender, _txId);
    }

    // Admin Functions
    function updateThreshold(uint _newThreshold) external onlyOwner {
        require(_newThreshold > 0, "threshold must be greater than 0");
        threshold = _newThreshold;
        emit ThresholdUpdated(_newThreshold);
    }

    function extendDeadline(uint _txId, uint _newDeadline)
    external
    onlyOwner
    txExists(_txId)
    notExecuted(_txId)
    {
        require(_newDeadline > block.timestamp, "new deadline must be in future");
        require(_newDeadline > transactions[_txId].deadline, "can only extend deadline");

        transactions[_txId].deadline = _newDeadline;
        emit DeadlineExtended(_txId, _newDeadline);
    }

    // View Functions
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
        uint numApprovals,
        uint deadline
    )
    {
        Transaction storage transaction = transactions[_txId];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numApprovals,
            transaction.deadline
        );
    }

    function getThreshold() external view returns (uint) {
        return threshold;
    }

    function isTransactionExpired(uint _txId) external view returns (bool) {
        return block.timestamp > transactions[_txId].deadline;
    }
}