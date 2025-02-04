import CryptoJS from 'crypto-js';
import { broadcastLast } from './p2p.js';

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
    'Genesis block',
    0,
    0
);

let blockchain = [genesisBlock];

const TIME_DIFFICULTY = 10;
const BLOCKS_INTERVAL = 10;

/////////// GETTERS
function getBlockchain() {
    return blockchain;
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

function generateNextBlock(blockData) {
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
    addBlock(newBlock);
    broadcastLast();
    return newBlock;
}

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
        blockchain.push(newBlock);
        return true;
    }
    return false;
}

function replaceChain(newBlocks) {
    if (
        isValidChain(newBlocks) &&
        getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())
    ) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        broadcastLast();
    } else {
        console.log('Received blockchain invalid');
    }
}

/////////// Validaciones
function isValidBlockStructure(block) {
    return (
        typeof block.index === 'number' &&
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'string'
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

function isValidChain(blockchainToValidate) {
    function isValidGenesis(block) {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    }

    if (!isValidGenesis(blockchainToValidate[0])) {
        return false;
    }

    for (let i = 1; i < blockchainToValidate.length; i++) {
        if (!isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return false;
        }
    }
    return true;
}

export {
    Block,
    getBlockchain,
    getLastBlock,
    generateNextBlock,
    isValidBlockStructure,
    replaceChain,
    addBlock,
};