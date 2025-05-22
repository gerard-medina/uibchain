import CryptoJS from 'crypto-js';
import { processTransactions, getCoinbaseTransaction, isValidAddress } from './transaction.js'
import { broadcastLast, broadCastTransactionPool } from './p2p.js';
import { createTransaction, findUnspentTrOuts, getBalance, getPrivateFromWallet, getPublicFromWallet, } from './wallet.js';
import { addToTransactionPool, getTransactionPool, updateTransactionPool } from './transactionPool.js';
import _ from 'lodash';

class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const genesisBlock = new Block(
    0,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '',
    1737832682,
    [],
    0,
    0
);

let blockchain = [genesisBlock];

let unspentTrOuts = [];

const TIME_DIFFICULTY = 10;
const BLOCKS_INTERVAL = 10;

/////////// GETTERS
function getBlockchain() {
    return blockchain;
}
function getUnspentTrOuts() {
    return _.cloneDeep(unspentTrOuts);
}
function getMyUnspentTrOuts() {
    return findUnspentTrOuts(getPublicFromWallet(), getUnspentTrOuts());
}
function getLastBlock() {
    return blockchain[blockchain.length - 1];
}
function getCurrentTimestamp() {
    return Math.round(new Date().getTime() / 1000);
}
function getDifficulty(auxBlockchain) {
    const lastBlock = auxBlockchain[blockchain.length - 1];
    if (
        lastBlock.index % BLOCKS_INTERVAL === 0 &&
        lastBlock.index !== 0
    ) {
        return getNewDifficulty(lastBlock, auxBlockchain);
    } else {
        return lastBlock.difficulty;
    }
}
function getNewDifficulty(lastBlock, auxBlockchain) {
    const lastIntervalBlock =
        auxBlockchain[blockchain.length - BLOCKS_INTERVAL];
    const timeExpected = TIME_DIFFICULTY * BLOCKS_INTERVAL;
    const actualTime = lastBlock.timestamp - lastIntervalBlock.timestamp;
    if (actualTime < timeExpected / 2) {
        return lastIntervalBlock.difficulty + 1;
    } else if (actualTime > timeExpected * 2) {
        return lastIntervalBlock.difficulty - 1;
    } else {
        return lastIntervalBlock.difficulty;
    }
}
function getAccountBalance() {
    return getBalance(getPublicFromWallet(), getUnspentTrOuts());
};

/////////// SETTERS
function setUnspentTrOuts(newUnspentTrOuts) {
    unspentTrOuts = newUnspentTrOuts;
};

function sendTransaction(address, amount) {
    const tr = createTransaction(address, amount, getPrivateFromWallet(), getUnspentTrOuts(), getTransactionPool());
    addToTransactionPool(tr, getUnspentTrOuts());
    broadCastTransactionPool();
    return tr;
};

function generateRawNextBlock(blockData) {
    const previousBlock = getLastBlock();
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = getCurrentTimestamp();
    const difficulty = getDifficulty(getBlockchain());
    console.log('Difficulty: ' + difficulty);
    const newBlock = mineBlock(
        nextIndex,
        previousBlock.hash,
        nextTimestamp,
        blockData,
        difficulty
    );
    console.log('Mined');
    if (addBlock(newBlock)) {
        broadcastLast();
        return newBlock;
    } else {
        return null;
    }
}

function generateNextBlockWithTransaction(receiverAddress, amount) {
    if (!isValidAddress(receiverAddress)) {
        throw Error('Invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('Invalid amount');
    }
    const coinbaseTr = getCoinbaseTransaction(getPublicFromWallet(), getLastBlock().index + 1);
    const tr = createTransaction(receiverAddress, amount, getPrivateFromWallet(), getUnspentTrOuts(), getTransactionPool());
    const blockData = [coinbaseTr, tr];
    return generateRawNextBlock(blockData);
};

function generateNextBlock() {
    const coinbaseTr = getCoinbaseTransaction(getPublicFromWallet(), getLastBlock().index + 1);
    const blockData = [coinbaseTr].concat(getTransactionPool());
    return generateRawNextBlock(blockData);
};

function mineBlock(index, previousHash, timestamp, data, difficulty) {
    let nonce = 0;
    while (true) {
        const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
}

function calculateHash(index, previousHash, timestamp, data, difficulty, nonce) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
}


function calculateBlockHash(block) {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
}

function addBlock(newBlock) {
    if (isValidNewBlock(newBlock, getLastBlock())) {
        const newTrOuts = processTransactions(newBlock.data, getUnspentTrOuts(), newBlock.index);
        if (newTrOuts === null) {
            return false;
        } else {
            blockchain.push(newBlock);
            setUnspentTrOuts(newTrOuts);
            updateTransactionPool(unspentTrOuts);
            return true;
        }
    }
    return false;
}

function replaceChain(newBlocks) {
    const auxUnspentTrOuts = isValidChain(newBlocks);
    if (
        (auxUnspentTrOuts !== null) &&
        getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())
    ) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        setUnspentTrOuts(auxUnspentTrOuts);
        updateTransactionPool(auxUnspentTrOuts);
        broadcastLast();
    } else {
        console.log('Received blockchain invalid');
    }
}

function addReceivedTransaction(transaction) {
    addToTransactionPool(transaction, getUnspentTrOuts());
};

/////////// Validaciones
function isValidBlockStructure(block) {
    return (
        typeof block.index === 'number' &&
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'object'
    );
}

function isValidNewBlock(newBlock, previousBlock) {
    if (!isValidBlockStructure(newBlock)) {
        console.log('Invalid structure');
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('Invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('Invalid previoushash');
        return false;
    } else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log('Invalid timestamp');
        return false;
    } else if (!hasValidHash(newBlock)) {
        return false;
    }
    return true;
}

function getAccumulatedDifficulty(auxBlockchain) {
    return auxBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
}

function isValidTimestamp(newBlock, previousBlock) {
    return (
        previousBlock.timestamp - 60 < newBlock.timestamp &&
        newBlock.timestamp - 60 < getCurrentTimestamp()
    );
}

function hasValidHash(block) {
    if (calculateBlockHash(block) !== block.hash) {
        console.log('Invalid hash, got:' + block.hash);
        return false;
    }

    if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
        console.log(
            'Expected difficulty: ' +
            block.difficulty +
            'Got hash: ' +
            block.hash
        );
    }
    return true;
}

function hashMatchesDifficulty(hash, difficulty) {
    const hashInBinary = hexToBinary(hash);
    const prefix = '0'.repeat(difficulty);
    return hashInBinary.startsWith(prefix);
}

function hexToBinary(hex) {
    let bin = '';
    const map = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111'
    };
    for (let i = 0; i < hex.length; i = i + 1) {
        if (map[hex[i]]) {
            bin += map[hex[i]];
        } else {
            return null;
        }
    }
    return bin;
};

// Valida todas las transacciones y todos los bloques de la cadena.
// Devuelve las unspentTrOuts si es valida.
function isValidChain(blockchainToValidate) {
    function isValidGenesis(block) {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    }

    if (!isValidGenesis(blockchainToValidate[0])) {
        return null;
    }

    let auxUnspentTrOuts = [];

    for (let i = 0; i < blockchainToValidate.length; i++) {
        const currentBlock = blockchainToValidate[i];
        if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return null;
        }

        auxUnspentTrOuts = processTransactions(currentBlock.data, auxUnspentTrOuts, currentBlock.index);
        if (auxUnspentTrOuts === null) {
            console.log('Invalid transactions in blockchain');
            return null;
        }
    }
    return auxUnspentTrOuts;
}

export {
    Block,
    getBlockchain,
    getLastBlock,
    getAccountBalance,
    getUnspentTrOuts,
    getMyUnspentTrOuts,
    sendTransaction,
    generateNextBlock,
    generateRawNextBlock,
    generateNextBlockWithTransaction,
    isValidBlockStructure,
    replaceChain,
    addBlock,
    addReceivedTransaction
};