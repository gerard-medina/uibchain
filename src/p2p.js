import { WebSocketServer, WebSocket } from 'ws';
import {
    addBlock,
    getBlockchain,
    getLastBlock,
    isValidBlockStructure,
    replaceChain,
} from './blockchain.js';

const sockets = [];

const MessageType = {
    QUERY_LAST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2,
};

class Message {
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }
}

function getSockets() {
    return sockets;
}

/////////// Conexiones P2P
function initP2PServer(P2P_PORT) {
    const server = new WebSocketServer({ port: P2P_PORT });
    server.on('connection', (ws) => {
        initConnection(ws);
    });
    console.log('Listening websocket p2p port on: ' + P2P_PORT);
}
function connectToPeers(newPeer) {
    const ws = new WebSocket(newPeer);
    ws.on('open', () => {
        initConnection(ws);
    });
    ws.on('error', () => {
        console.log('Connection failed');
    });
}
function initConnection(ws) {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    send(ws, queryChainLengthMsg());
}

function JSONParse(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.log(e);
        return null;
    }
}
function initMessageHandler(ws) {
    ws.on('message', (data) => {
        const message = JSONParse(data);
        if (message === null) {
            console.log('Could not parse received JSON message: ' + data);
            return;
        }
        console.log('Received message' + JSON.stringify(message));

        switch (message.type) {
            case MessageType.QUERY_LAST:
                send(ws, responseLastMsg());
                break;
            case MessageType.QUERY_ALL:
                send(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                const receivedBlocks = JSONParse(message.data);
                if (receivedBlocks === null) {
                    console.log('Invalid blocks received:');
                    console.log(message.data);
                    break;
                }
                handleBlockchainResponse(receivedBlocks);
                break;
        }
    });
}
function initErrorHandler(ws) {
    const closeConnection = (ws_aux) => {
        console.log('Connection failed to peer: ' + ws_aux.url);
        sockets.splice(sockets.indexOf(ws_aux), 1);
    };
    ws.on('close', () => {
        closeConnection(ws);
    });
    ws.on('error', () => {
        closeConnection(ws);
    });
}

/////////// Envío de mensajes a la red P2P
function send(ws, message) {
    ws.send(JSON.stringify(message));
}
function broadcast(message) {
    sockets.forEach((socket) => send(socket, message));
}
function broadcastLast() {
    broadcast(responseLastMsg());
}

/////////// Tipos de respuestas
function queryChainLengthMsg() {
    return new Message(MessageType.QUERY_LAST, null);
}
function queryAllMsg() {
    return new Message(MessageType.QUERY_ALL, null);
}
function responseChainMsg() {
    return {
        type: MessageType.RESPONSE_BLOCKCHAIN,
        data: JSON.stringify(getBlockchain()),
    };
}
function responseLastMsg() {
    return {
        type: MessageType.RESPONSE_BLOCKCHAIN,
        data: JSON.stringify([getLastBlock()]),
    };
}

function handleBlockchainResponse(receivedBlocks) {
    if (receivedBlocks.length === 0) {
        console.log('Received block chain size of 0');
        return;
    }

    const lastBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    if (!isValidBlockStructure(lastBlockReceived)) {
        console.log('Block structure not valid');
        return;
    }

    const thisLastBlock = getLastBlock();
    if (lastBlockReceived.index > thisLastBlock.index) {
        console.log(
            'Blockchain possibly behind. We got: ' +
            thisLastBlock.index +
            ' Peer got: ' +
            lastBlockReceived.index
        );
        
        if (thisLastBlock.hash === lastBlockReceived.previousHash) {
            if (addBlock(lastBlockReceived)) {
                broadcast(responseLastMsg());
            }
        } else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            broadcast(queryAllMsg());
        } else {
            console.log('Received blockchain is longer than current blockchain');
            replaceChain(receivedBlocks);
        }
    } else {
        console.log('Received blockchain is not longer than received blockchain. Do nothing');
    }
}

export { connectToPeers, broadcastLast, initP2PServer, getSockets };