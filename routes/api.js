import express from 'express'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../middleware/auth.js'
import {
    generateRawNextBlock, generateNextBlock, generateNextBlockWithTransaction, getAccountBalance,
    getBlockchain, getMyUnspentTrOuts, getUnspentTrOuts, sendTransaction
} from '../src/blockchain.js';
import { connectToPeers, getSockets } from "../src/p2p.js";
import { initWallet, getPublicFromWallet } from '../src/wallet.js';
import { getTransactionPool } from "../src/transactionPool.js";

const router = express.Router()
const AUTH_SECRET = process.env.AUTH_SECRET || 'TODO_changeInYourNode';

router.get('/ping', (req, res) => {
    res.send('pong');
})

// router.post('/login', (req, res) => {
//   const { username, password } = req.body;
//   if (username === 'admin' && password === '123') {
//     const token = jwt.sign({ username, role: 'admin' }, AUTH_SECRET, { expiresIn: '1h' });
//     return res.json({ token });
//   }
//   if (username === 'user' && password === '123') {
//     const token = jwt.sign({ username, role: 'user' }, AUTH_SECRET, { expiresIn: '1h' });
//     return res.json({ token });
//   }
//   res.status(401).send('Credenciales inválidas');
// })

// router.get('/admin-data', verifyToken, (req, res) => {
//   if (req.user.role !== 'admin') return res.status(403).send('Sin permiso')
//   res.send('Contenido exclusivo de admin')
// })

router.post('/sendTransaction', verifyToken, (req, res) => {
    try {
        const address = req.body.address;
        const amount = req.body.amount;

        if (address === undefined || amount === undefined) {
            throw Error('Invalid address or amount');
        }
        const resp = sendTransaction(address, amount);
        res.send(resp);
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
});

router.get("/blocks", (req, res) => {
    res.send(getBlockchain());
})

router.post("/mineRawBlock", (req, res) => {
    if (req.body.data == null) {
        res.send('Missing data param');
        return;
    }
    const newBlock = generateRawNextBlock(req.body.data);
    if (newBlock === null) {
        res.status(400).send('Invalid block');
    } else {
        res.send(newBlock);
    }
})

router.post('/mineBlock', (req, res) => {
    const newBlock = generateNextBlock();
    if (newBlock === null) {
        res.status(400).send('Invalid block');
    } else {
        res.send(newBlock);
    }
});

router.post('/mineTransaction', (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    try {
        const resp = generateNextBlockWithTransaction(address, amount);
        res.send(resp);
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
});

router.get('/balance', (req, res) => {
    const balance = getAccountBalance();
    res.send({ 'balance': balance });
});

router.get('/transactionPool', (req, res) => {
    res.send(getTransactionPool());
});

router.get('/unspentTransactionOutputs', (req, res) => {
    res.send(getUnspentTrOuts());
});

router.get('/myUnspentTransactionOutputs', (req, res) => {
    res.send(getMyUnspentTrOuts());
});

router.get('/address', (req, res) => {
    res.send({ 'address': getPublicFromWallet() });
});

router.get("/peers", (req, res) => {
    res.send(
        getSockets().map(
            s => s._socket.remoteAddress + ":" + s._socket.remotePort
        )
    );
})

router.post("/addPeer", (req, res) => {
    connectToPeers(req.body.peer);
    res.send();
})

router.post("/addWallet", (req, res) => {
    if (req.body.userName == null || typeof req.body.userName !== 'string') {
        res.send('Invalid userName');
        return;
    }
    initWallet(req.body.userName);
    res.send({ 'address': getPublicFromWallet() });
});

export default router
