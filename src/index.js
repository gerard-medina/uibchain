import express from "express";
import cors from 'cors'
import apiRoutes from '../routes/api.js'

import { connectToPeers, initP2PServer } from "./p2p.js";
import { initWallet } from './wallet.js';

const NODE_PORT = parseInt(process.env.NODE_PORT) || 3001;
const P2P_PORT = parseInt(process.env.P2P_PORT) || 6001;
const initPeer = process.env.PEER || null;
const username = process.env.USER_NAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
const app = express();

app.use(express.json());

app.use(cors({
  origin: '*', // De momento cualquiera
  methods: ['GET', 'POST'],
}))

app.use((err, req, res, next) => {
    if (err) {
        res.status(400).send(err.message);
    }
});

app.use('/', apiRoutes);

app.listen(NODE_PORT, () => {
    console.log("Listening Node on port: " + NODE_PORT);
})

if (initPeer) {
    console.log("Connecting to initial peer: " + initPeer);
    connectToPeers(initPeer);
}

initP2PServer(P2P_PORT);
initWallet(username, adminPassword, 'admin');