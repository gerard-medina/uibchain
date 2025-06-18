import express from 'express'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../middleware/auth.js'
import {
    generateRawNextBlock, generateNextBlock, generateNextBlockWithTransaction, getAccountBalance,
    getBlockchain, getMyUnspentTrOuts, getUnspentTrOuts, sendTransaction
} from '../src/blockchain.js';
import { connectToPeers, getSockets } from "../src/p2p.js";
import { initWallet, walletPath, getPublicFromWallet, getRole, checkPassword } from '../src/wallet.js';
import { getTransactionPool } from "../src/transactionPool.js";
import { existsSync } from 'fs';

const router = express.Router()
const AUTH_SECRET = process.env.AUTH_SECRET || 'TODO_changeInYourNode';

router.get('/ping', (req, res) => {
    res.send('pong');
})

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    try {
        if (checkPassword(username, password)) {
            const role = getRole(username);
            const payload = { username };
            if (role) payload.role = role;
            const token = jwt.sign(payload, AUTH_SECRET, { expiresIn: '1h' });
            return res.send({ 'token': token });
        }
        res.status(401).send('Invalid credentials');
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
})

router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).send('Username and password are required');
    }
    try {
        if (existsSync(walletPath + username + '.json')) {
            return res.status(400).send('Username already exists');
        }
        initWallet(username, password, 'user');
        res.send({ 'address': getPublicFromWallet(username) });
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
});

router.post('/sendTransaction', verifyToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'user') {
        return res.status(403).send('Unauthorized');
    }
    try {
        const username = req.user.username;
        const address = req.body.address;
        const amount = req.body.amount;

        if (address === undefined || amount === undefined) {
            throw Error('Invalid address or amount');
        }
        const resp = sendTransaction(username, address, amount);
        res.send(resp);
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
});

router.get("/blocks", (req, res) => {
    res.send(getBlockchain());
})

router.post("/mineRawBlock", verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }
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

router.post('/mineBlock', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }
    const newBlock = generateNextBlock(req.user.username);
    if (newBlock === null) {
        res.status(400).send('Invalid block');
    } else {
        res.send(newBlock);
    }
});

router.post('/mineTransaction', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }
    try {
        const username = req.body.username;
        const address = req.body.address;
        const amount = req.body.amount;

        if (address === undefined || amount === undefined) {
            throw Error('Invalid address or amount');
        }
        const resp = generateNextBlockWithTransaction(username, address, amount);
        res.send(resp);
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e.message);
    }
});

router.get('/balance', verifyToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'user') {
        return res.status(403).send('Unauthorized');
    }
    const balance = getAccountBalance(req.user.username);
    res.send({ 'balance': balance });
});

router.get('/transactionPool', (req, res) => {
    res.send(getTransactionPool());
});

router.get('/unspentTransactionOutputs', (req, res) => {
    res.send(getUnspentTrOuts());
});

router.get('/myUnspentTransactionOutputs', verifyToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'user') {
        return res.status(403).send('Unauthorized');
    }
    res.send(getMyUnspentTrOuts(req.user.username));
});

router.get('/address', (req, res) => {
    const username = req.query.username;
    if (!username || typeof username !== 'string') {
        return res.status(400).send('Invalid username');
    }
    res.send({ 'address': getPublicFromWallet(username) });
});

router.get("/peers", verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }
    res.send(
        getSockets().map(
            s => s._socket.remoteAddress + ":" + s._socket.remotePort
        )
    );
})

router.post("/addPeer", verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }
    connectToPeers(req.body.peer);
    res.send();
})

export default router
