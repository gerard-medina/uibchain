import bodyParser from "body-parser";
import express from "express";
import { generateRawNextBlock, generateNextBlock, generateNextBlockWithTransaction, getAccountBalance, getBlockchain } from "./blockchain.js";
import { connectToPeers, getSockets, initP2PServer } from "./p2p.js";
import { initWallet } from './wallet.js';

const NODE_PORT = parseInt(process.env.NODE_PORT) || 3001;
const P2P_PORT = parseInt(process.env.P2P_PORT) || 6001;
const initPeer = process.env.PEER || null;
const app = express();

app.use(bodyParser.json());

app.use((err, req, res, next) => {
    if (err) {
        res.status(400).send(err.message);
    }
});

app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
})

app.post("/mineRawBlock", (req, res) => {
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

app.post('/mineBlock', (req, res) => {
    const newBlock = generateNextBlock();
    if (newBlock === null) {
        res.status(400).send('Invalid block');
    } else {
        res.send(newBlock);
    }
});

app.post('/mineTransaction', (req, res) => {
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

app.get('/balance', (req, res) => {
    const balance = getAccountBalance();
    res.send({ 'balance': balance });
});

app.get("/peers", (req, res) => {
    res.send(
        getSockets().map(
            s => s._socket.remoteAddress + ":" + s._socket.remotePort
        )
    );
})

app.post("/addPeer", (req, res) => {
    connectToPeers(req.body.peer);
    res.send();
})

app.listen(NODE_PORT, () => {
    console.log("Listening Node on port: " + NODE_PORT);
})

if (initPeer) {
    console.log("Connecting to initial peer: " + initPeer);
    connectToPeers(initPeer);
}

initP2PServer(P2P_PORT);
initWallet();