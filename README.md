# uibchain
Academic blockchain for the University of the Balearic Islands

##### Get blockchain
```
curl http://localhost:3001/blocks
```

##### Create block
```
curl -H "Content-type:application/json" --data '{"data" : "Test block"}' http://localhost:3001/mineBlock
``` 

##### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6002"}' http://localhost:3001/addPeer
```

#### Show peers
```
curl http://localhost:3001/peers
```