import CryptoJS from 'crypto-js';
import { broadcastLast } from './p2p.js';

class Block {
    constructor(index, hash, previousHash, timestamp, data) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
    }
}

const genesisBlock = new Block(
    0,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '',
    1737832682,
    'Genesis block'
);

let blockchain = [genesisBlock];

/////////// GETTERS
function getBlockchain() {
    return blockchain;
}
function getLastBlock() {
    return blockchain[blockchain.length - 1];
}

function generateNextBlock(blockData) {
    const previousBlock = getLastBlock();
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = new Date().getTime() / 1000;
    const nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
    const newBlock = new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, blockData);
    addBlock(newBlock);
    broadcastLast();
    return newBlock;
}

function calculateHash(index, previousHash, timestamp, data) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
}

function calculateBlockHash(block) {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
}

function addBlock(newBlock) {
    if (isValidNewBlock(newBlock, getLastBlock())) {
        blockchain.push(newBlock);
        return true;
    }
    return false;
}

function replaceChain(newBlocks) {
    if (isValidChain(newBlocks) && newBlocks.length > getBlockchain().length) {
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
    } else if (calculateBlockHash(newBlock) !== newBlock.hash) {
        console.log(typeof newBlock.hash + ' ' + typeof calculateBlockHash(newBlock));
        console.log('Invalid hash: ' + calculateBlockHash(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    
    return true;
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