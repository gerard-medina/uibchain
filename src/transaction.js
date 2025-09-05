import CryptoJS from 'crypto-js';
import ecdsa from 'elliptic';
import _ from 'lodash';

const ec = new ecdsa.ec('secp256k1');

const COINBASE_AMOUNT = 50;

class UnspentTrOut {
    constructor(trOutId, trOutIndex, address, amount) {
        this.trOutId = trOutId;
        this.trOutIndex = trOutIndex;
        this.address = address;
        this.amount = amount;
    }
}

class TrIn {
    trOutId;
    trOutIndex;
    signature;
}

class TrOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}

class Transaction {
    id;
    trIns = [];
    trOuts = [];
    senderAddress;
}

function getTransactionId(transaction) {
    const trInContent = transaction.trIns
        .map((trIn) => trIn.trOutId + trIn.trOutIndex)
        .reduce((a, b) => a + b, '');

    const trOutContent = transaction.trOuts
        .map((trOut) => trOut.address + trOut.amount)
        .reduce((a, b) => a + b, '');

    return CryptoJS.SHA256(trInContent + trOutContent).toString();
};

function validateTransaction(transaction, unspentTrOuts) {
    if (!isValidTransactionStructure(transaction)) {
        return false;
    }

    if (getTransactionId(transaction) !== transaction.id) {
        console.log('Invalid tr id: ' + transaction.id);
        return false;
    }
    const hasValidTrIns = transaction.trIns
        .map((trIn) => validateTrIn(trIn, transaction, unspentTrOuts))
        .reduce((a, b) => a && b, true);

    if (!hasValidTrIns) {
        console.log('Some of the trIns are invalid in tr: ' + transaction.id);
        return false;
    }

    const totalTrInValues = transaction.trIns
        .map((trIn) => getTrInAmount(trIn, unspentTrOuts))
        .reduce((a, b) => (a + b), 0);

    const totalTrOutValues = transaction.trOuts
        .map((trOut) => trOut.amount)
        .reduce((a, b) => (a + b), 0);

    if (totalTrOutValues !== totalTrInValues) {
        console.log('totalTrOutValues !== totalTrInValues in tr: ' + transaction.id);
        return false;
    }

    return true;
};

function validateBlockTransactions(trs, unspentTrOuts, blockIndex) {
    const coinbaseTr = trs[0];
    if (!validateCoinbaseTr(coinbaseTr, blockIndex)) {
        console.log('Invalid coinbase transaction: ' + JSON.stringify(coinbaseTr));
        return false;
    }

    // No permitir que se copien trIns ya incluidos
    const trIns = _(trs)
        .map(tr => tr.trIns)
        .flatten()
        .value();

    if (hasDuplicates(trIns)) {
        return false;
    }

    const normalTransactions = trs.slice(1); // Coinbase ya validada
    return normalTransactions.map((tr) => validateTransaction(tr, unspentTrOuts))
        .reduce((a, b) => (a && b), true);

};

function hasDuplicates(trIns) {
    const groups = _.countBy(trIns, (trIn) => trIn.trOutId + trIn.trOutId);
    return _(groups)
        .map((value, key) => {
            if (value > 1) {
                console.log('Duplicate trIn: ' + key);
                return true;
            } else {
                return false;
            }
        })
        .includes(true);
};

function validateCoinbaseTr(transaction, blockIndex) {
    if (transaction == null) {
        console.log('The first transaction in the block must be coinbase transaction');
        return false;
    }
    if (getTransactionId(transaction) !== transaction.id) {
        console.log('Invalid coinbase tr id: ' + transaction.id);
        return false;
    }
    if (transaction.trIns.length !== 1) {
        console.log('One trIn must be specified in the coinbase transaction');
        return;
    }
    if (transaction.trIns[0].trOutIndex !== blockIndex) {
        console.log('The trIn signature in coinbase tr must be the block height');
        return false;
    }
    if (transaction.trOuts.length !== 1) {
        console.log('Invalid number of trOuts in coinbase transaction');
        return false;
    }
    if (transaction.trOuts[0].amount !== COINBASE_AMOUNT) {
        console.log('Invalid coinbase amount in coinbase transaction');
        return false;
    }
    return true;
};

function validateTrIn(trIn, transaction, unspentTrOuts) {
    const referencedUTrOut =
        unspentTrOuts.find((uTrO) => uTrO.trOutId === trIn.trOutId && uTrO.trOutIndex === trIn.trOutIndex);
    if (referencedUTrOut == null) {
        console.log('Referenced trOut not found: ' + JSON.stringify(trIn));
        return false;
    }
    const address = referencedUTrOut.address;

    const key = ec.keyFromPublic(address, 'hex');
    const validSignature = key.verify(transaction.id, trIn.signature);
    if (!validSignature) {
        console.log('Invalid trIn signature: %s trId: %s address: %s', trIn.signature, transaction.id, referencedUTrOut.address);
        return false;
    }
    return true;
};

function getTrInAmount(trIn, unspentTrOuts) {
    return findUnspentTrOut(trIn.trOutId, trIn.trOutIndex, unspentTrOuts).amount;
};

function findUnspentTrOut(trId, index, unspentTrOuts) {
    return unspentTrOuts.find((uTrO) => uTrO.trOutId === trId && uTrO.trOutIndex === index);
};

function getCoinbaseTransaction(address, blockIndex) {
    const t = new Transaction();
    const trIn = new TrIn();
    trIn.signature = "";
    trIn.trOutId = "";
    trIn.trOutIndex = blockIndex;

    t.trIns = [trIn];
    t.trOuts = [new TrOut(address, COINBASE_AMOUNT)];
    t.id = getTransactionId(t);
    return t;
};

function signTrIn(transaction, trInIndex, privateKey, unspentTrOuts) {
    const trIn = transaction.trIns[trInIndex];

    const dataToSign = transaction.id;
    const referencedUnspentTrOut = findUnspentTrOut(trIn.trOutId, trIn.trOutIndex, unspentTrOuts);
    if (referencedUnspentTrOut == null) {
        console.log('Could not find referenced trOut');
        throw Error();
    }
    const referencedAddress = referencedUnspentTrOut.address;

    if (getPublicKey(privateKey) !== referencedAddress) {
        console.log('trying to sign an input with private' +
            ' key that does not match the address that is referenced in trIn');
        throw Error();
    }
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature = toHexString(key.sign(dataToSign).toDER());

    return signature;
};

function updateUnspentTrOuts(newTransactions, unspentTrOuts) {
    const newUnspentTrOuts = newTransactions
        .map((t) => {
            return t.trOuts.map((trOut, index) => new UnspentTrOut(t.id, index, trOut.address, trOut.amount));
        })
        .reduce((a, b) => a.concat(b), []);

    const consumedTrOuts = newTransactions
        .map((t) => t.trIns)
        .reduce((a, b) => a.concat(b), [])
        .map((trIn) => new UnspentTrOut(trIn.trOutId, trIn.trOutIndex, '', 0));

    const finalUnspentTrOuts = unspentTrOuts
        .filter(((uTrO) => !findUnspentTrOut(uTrO.trOutId, uTrO.trOutIndex, consumedTrOuts)))
        .concat(newUnspentTrOuts);

    return finalUnspentTrOuts;
};

function processTransactions(trs, unspentTrOuts, blockIndex) {
    if (!validateBlockTransactions(trs, unspentTrOuts, blockIndex)) {
        console.log('Invalid block transactions');
        return null;
    }
    return updateUnspentTrOuts(trs, unspentTrOuts);
};

function toHexString(byteArray) {
    return Array.from(byteArray, (byte) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
};

function getPublicKey(aPrivateKey) {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex');
};

function isValidTrInStructure(trIn) {
    if (trIn == null) {
        console.log('TransactionIn is null');
        return false;
    } else if (typeof trIn.signature !== 'string') {
        console.log('Invalid signature type in trIn');
        return false;
    } else if (typeof trIn.trOutId !== 'string') {
        console.log('Invalid trOutId type in trIn');
        return false;
    } else if (typeof trIn.trOutIndex !== 'number') {
        console.log('Invalid trOutIndex type in trIn');
        return false;
    } else {
        return true;
    }
};

function isValidTrOutStructure(trOut) {
    if (trOut == null) {
        console.log('trOut is null');
        return false;
    } else if (typeof trOut.address !== 'string') {
        console.log('Invalid address type in trOut');
        return false;
    } else if (!isValidAddress(trOut.address)) {
        console.log('Invalid TrOut address');
        return false;
    } else if (typeof trOut.amount !== 'number') {
        console.log('Invalid amount type in trOut');
        return false;
    } else {
        return true;
    }
};

function isValidTransactionStructure(transaction) {
    if (typeof transaction.id !== 'string') {
        console.log('Transaction id missing');
        return false;
    }
    if (!(transaction.trIns instanceof Array)) {
        console.log('Invalid trIns type in transaction');
        return false;
    }
    if (!transaction.trIns
        .map(isValidTrInStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }

    if (!(transaction.trOuts instanceof Array)) {
        console.log('Invalid trOuts type in transaction');
        return false;
    }

    if (!transaction.trOuts
        .map(isValidTrOutStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }

    if (typeof transaction.senderAddress !== 'string') {
        return false;
    }
    return true;
};

// Formato de la public address ecdsa 04 + X-coordinate + Y-coordinate
function isValidAddress(address) {
    if (address.length !== 130) {
        console.log('Invalid public key length');
        return false;
    } else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('Public key must contain only hex characters');
        return false;
    } else if (!address.startsWith('04')) {
        console.log('Public key must start with 04');
        return false;
    }
    return true;
};

export {
    processTransactions,
    signTrIn,
    getTransactionId,
    UnspentTrOut,
    TrIn,
    TrOut,
    getCoinbaseTransaction,
    getPublicKey,
    Transaction,
    isValidAddress,
    validateTransaction,
    hasDuplicates
}
