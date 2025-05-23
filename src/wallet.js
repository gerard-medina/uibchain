import ecdsa from 'elliptic';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import _ from 'lodash';
import { getPublicKey, getTransactionId, signTrIn, Transaction, TrIn, TrOut } from './transaction.js';

const ec = new ecdsa.ec('secp256k1');
const walletPath = 'wallets/';

function getPrivateFromWallet() {
    const wallet = JSON.parse(readFileSync(walletPath + (process.env.USER_NAME || 'admin') + '.json', 'utf8'));
    return wallet.private_key;
};

function getPublicFromWallet() {
    const wallet = JSON.parse(readFileSync(walletPath + (process.env.USER_NAME || 'admin') + '.json', 'utf8'));
    return wallet.public_key;
};

function generatePrivateKey() {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};

function initWallet(userName) {
    if (existsSync(walletPath + userName + '.json')) {
        return;
    }
    const newPrivateKey = generatePrivateKey();
    const public_key = getPublicKey(newPrivateKey);
    const keys = JSON.stringify({ public_key: public_key, private_key: newPrivateKey });
    writeFileSync(walletPath + userName + '.json', keys);
    console.log('New wallet created, public key: ' + public_key);
};

function getBalance(address, unspentTrOuts) {
    return _(findUnspentTrOuts(address, unspentTrOuts))
        .filter((unspentTrOut) => unspentTrOut.address === address)
        .map((unspentTrOut) => unspentTrOut.amount)
        .sum();
};

function findUnspentTrOuts(address, unspentTrOuts) {
    return _.filter(unspentTrOuts, (uTrO) => uTrO.address === address);
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

// Sacar los unspentOutputs cuyos inputs ya estan en la pool
function filterPoolExistingTrIns(unspentTrOuts, pool) {
    const trIns = _(pool)
        .map((tr) => tr.trIns)
        .flatten()
        .value();
    const removable = [];
    for (const unspentTrOut of unspentTrOuts) {
        const trIn = _.find(trIns, (auxTrIn) => {
            return auxTrIn.trOutIndex === unspentTrOut.trOutIndex && auxTrIn.trOutId === unspentTrOut.trOutId;
        });

        if (trIn !== undefined) {
            removable.push(unspentTrOut);
        }
    }
    return _.without(unspentTrOuts, ...removable);
};

function createTransaction(receiverAddress, amount, privateKey, unspentTrOuts, pool) {

    const myAddress = getPublicKey(privateKey);
    const auxMyUnspentTrOuts = unspentTrOuts.filter((unspentTrOut) => unspentTrOut.address === myAddress);
    const myUnspentTrOuts = filterPoolExistingTrIns(auxMyUnspentTrOuts, pool);

    const { includedUnspentTrOuts, leftOverAmount } = findTrOutsForAmount(amount, myUnspentTrOuts);

    const unsignedTrIns = includedUnspentTrOuts.map(unspentTrOut => {
        const trIn = new TrIn();
        trIn.trOutId = unspentTrOut.trOutId;
        trIn.trOutIndex = unspentTrOut.trOutIndex;
        return trIn;
    });

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
    initWallet,
    findUnspentTrOuts
};
