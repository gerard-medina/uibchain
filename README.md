# uibchain
Academic blockchain for the University of the Balearic Islands

##### Get blockchain
```
curl http://localhost:3001/blocks
```

##### Add peer
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6002"}' http://localhost:3001/addPeer
```

#### Show peers
```
curl http://localhost:3001/peers
```

##### Create a raw block
```
curl -H "Content-type:application/json" --data '{
    "data": [
        {
            "trIns": [
                {
                    "signature": "",
                    "trOutId": "",
                    "trOutIndex": 3
                }
            ],
            "trOuts": [
                {
                    "address": "04a50c897bcd0520f9746c1f0430e53a6188d89d03e653c5e10d97fd5f58c79f88608db0f7bb1145f39561722bb7e0a0886b58f70f4c4e5ab1e594eb360a42cf28",
                    "amount": 50
                }
            ],
            "id": "738d7e1cdfdfe147e74c0ded7c7d265f3047dd68cc7dc2e6cace8f5d03c7df66"
        }
    ]
}' http://localhost:3001/mineRawBlock
``` 

##### Create transaction
```
curl -H "Content-type: application/json" --data '{
    "address": "04a50c897bcd0520f9746c1f0430e53a6188d89d03e653c5e10d97fd5f58c79f88608db0f7bb1145f39561722bb7e0a0886b58f70f4c4e5ab1e594eb360a42cf28",
    "amount" : 30
}' http://localhost:3001/mineTransaction
```

##### Get balance
```
curl http://localhost:3001/balance
```