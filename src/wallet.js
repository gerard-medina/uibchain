import ecdsa from 'elliptic';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import _ from 'lodash';
import { getPublicKey, getTransactionId, signTrIn, Transaction, TrIn, TrOut } from './transaction.js';

const ec = new ecdsa.ec('secp256k1');
const walletPath = 'wallet/';

function getPrivateFromWallet() {
    const buffer = readFileSync(walletPath + 'private_key', 'utf8');
    return buffer.toString();
};

function getPublicFromWallet() {
    const privateKey = getPrivateFromWallet();
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};

function generatePrivateKey() {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};

function initWallet() {
    if (existsSync(walletPath + 'private_key')) {
        return;
    }
    const newPrivateKey = generatePrivateKey();
    const public_key = getPublicKey(newPrivateKey);

    writeFileSync(walletPath + 'private_key', newPrivateKey);
    writeFileSync(walletPath + 'public_key', public_key);
    console.log('New wallet created, public key: ' + public_key);
};

function getBalance(address, unspentTrOuts) {
    return _(unspentTrOuts)
        .filter((unspentTrOut) => unspentTrOut.address === address)
        .map((unspentTrOut) => unspentTrOut.amount)
        .sum();
};

function findTrOutsForAmount(amount, myUnspentTrOuts) {
    let currentAmount = 0;
    const includedUnspentTrOuts = [];
    for (const myUnspentTrOut of myUnspentTrOuts) {
        includedUnspentTrOuts.push(myUnspentTrOut);
        currentAmount = currentAmount + myUnspentTrOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return { includedUnspentTrOuts, leftOverAmount };
        }
    }
    throw Error("You don't have coins to send this transaction");
};

function createTrOuts(receiverAddress, myAddress, amount, leftOverAmount) {
    const trOut1 = new TrOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [trOut1];
    } else {
        const leftOverTr = new TrOut(myAddress, leftOverAmount);
        return [trOut1, leftOverTr];
    }
};

function toUnsignedTrIn(unspentTrOut) { //TODO: pasar a funcio dins es map
    const trIn = new TrIn();
    trIn.trOutId = unspentTrOut.trOutId;
    trIn.trOutIndex = unspentTrOut.trOutIndex;
    return trIn;
};

function createTransaction(receiverAddress, amount, privateKey, unspentTrOuts) {

    const myAddress = getPublicKey(privateKey);
    const myUnspentTrOuts = unspentTrOuts.filter((unspentTrOut) => unspentTrOut.address === myAddress);

    const { includedUnspentTrOuts, leftOverAmount } = findTrOutsForAmount(amount, myUnspentTrOuts);

    const unsignedTrIns = includedUnspentTrOuts.map(toUnsignedTrIn);

    const tr = new Transaction();
    tr.trIns = unsignedTrIns;
    tr.trOuts = createTrOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tr.id = getTransactionId(tr);

    tr.trIns = tr.trIns.map((trIn, index) => {
        trIn.signature = signTrIn(tr, index, privateKey, unspentTrOuts);
        return trIn;
    });

    return tr;
};

export {
    createTransaction,
    getPublicFromWallet,
    getPrivateFromWallet,
    getBalance,
    generatePrivateKey,
    initWallet
};
