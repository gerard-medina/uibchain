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

##### Send transaction
```
curl -H "Content-type: application/json" --data '{"address": "046e33de7202ce47306f96e3f37d0e5eb00dccfc8494f4ae10d426baa78f3363fdffe837a2a34fe2ec9cb47d1224f926f6ceaa3639474dca700c6b4ed0306d4f5e", "amount" : 20}' http://localhost:3001/sendTransaction
```

##### Mine a block
```
curl -X POST http://localhost:3001/mineBlock
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

##### Get transaction pool
```
curl http://localhost:3001/transactionPool
```

##### Get balance
```
curl http://localhost:3001/balance
```

##### Add wallet
```
curl -H "Content-type: application/json" --data '{"userName": "test2"}' http://localhost:3001/addWallet
```