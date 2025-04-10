# uibchain
Academic blockchain for the University of the Balearic Islands

##### Get blockchain
```
curl http://localhost:3001/blocks
```

##### Create block
```
curl -H "Content-type:application/json" --data '{
    "data": [
        {
            "trIns": [
                {
                    "signature": "",
                    "trOutId": "",
                    "trOutIndex": 1
                }
            ],
            "trOuts": [
                {
                    "address": "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a",
                    "amount": 50
                }
            ],
            "id": "f089e8113094fab66b511402ecce021d0c1f664a719b5df1652a24d532b2f749"
        }
    ]
}' http://localhost:3001/mineBlock
``` 

##### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6002"}' http://localhost:3001/addPeer
```

#### Show peers
```
curl http://localhost:3001/peers
```