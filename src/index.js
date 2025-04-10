import bodyParser from "body-parser";
import express from "express";
import { generateNextBlock, getBlockchain } from "./blockchain.js";
import { connectToPeers, getSockets, initP2PServer } from "./p2p.js";

const NODE_PORT = parseInt(process.env.NODE_PORT) || 3001;
const P2P_PORT = parseInt(process.env.P2P_PORT) || 6001;
const app = express();

app.use(bodyParser.json());

app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
})

app.post("/mineBlock", (req, res) => {
    if (req.body.data == null) {
        res.send('Missing data param');
        return;
    }
    const newBlock = generateNextBlock(req.body.data);
    if (newBlock === null) {
        res.status(400).send('Invalid block');
    } else {
        res.send(newBlock);
    }
})

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

initP2PServer(P2P_PORT);
