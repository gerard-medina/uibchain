import _ from 'lodash';
import { validateTransaction } from './transaction.js';

let transactionPool = [];

function getTransactionPool() {
    return _.cloneDeep(transactionPool);
};

function addToTransactionPool(tr, unspentTrOuts) {
    if (!validateTransaction(tr, unspentTrOuts)) {
        throw Error('Trying to add invalid tr to pool');
    }

    if (!isValidTrForPool(tr, transactionPool)) {
        throw Error('Trying to add invalid tr to pool');
    }
    console.log('Adding to trPool: %s', JSON.stringify(tr));
    transactionPool.push(tr);
};

function hasTrIn(trIn, unspentTrOuts) {
    const foundTrIn = unspentTrOuts.find((uTrO) => {
        return uTrO.trOutId === trIn.trOutId && uTrO.trOutIndex === trIn.trOutIndex;
    });
    return foundTrIn !== undefined;
};

function updateTransactionPool(unspentTrOuts) {
    const invalidTrs = [];
    for (const tr of transactionPool) {
        for (const trIn of tr.trIns) {
            if (!hasTrIn(trIn, unspentTrOuts)) {
                invalidTrs.push(tr);
                break;
            }
        }
    }
    if (invalidTrs.length > 0) {
        console.log('Removing transactions from trPool: %s', JSON.stringify(invalidTrs));
        transactionPool = _.without(transactionPool, ...invalidTrs);
    }
};

function getTrPoolIns(auxTransactionPool) {
    return _(auxTransactionPool)
        .map((tr) => tr.trIns)
        .flatten()
        .value();
};

function isValidTrForPool(tr, auxTtransactionPool) {
    const trPoolIns = getTrPoolIns(auxTtransactionPool);

    function containsTrIn(trIns, trIn) {
        return _.find(trPoolIns, ((trPoolIn) => {
            return trIn.trOutIndex === trPoolIn.trOutIndex && trIn.trOutId === trPoolIn.trOutId;
        }));
    };

    for (const trIn of tr.trIns) {
        if (containsTrIn(trPoolIns, trIn)) {
            console.log('TrIn already found in the trPool');
            return false;
        }
    }
    return true;
};

export { addToTransactionPool, getTransactionPool, updateTransactionPool };
