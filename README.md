# uibchain
Academic blockchain for the University of the Balearic Islands

## Quickstart

Local (Node.js)
- Requisitos: Node 18+ (con opción de Docker integrada)
- Variables de entorno principales (valores por defecto entre paréntesis):
    - NODE_PORT (3001), P2P_PORT (6001)
    - AUTH_SECRET ("TODO_changeInYourNode")
    - USER_NAME ("admin"), ADMIN_PASSWORD ("admin")
    - PEER (url ws opcional para conectar a otro nodo)

Instalación y arranque
```
npm install
npm start
```

Docker Compose (3 nodos encadenados)
```
docker compose up --build -d
```
- Node1: http://localhost:3001
- Node2: http://localhost:3002 (conecta a Node1 vía ws://node1:6001)
- Node3: http://localhost:3003 (conecta a Node2)

## Autenticación y roles

El API usa JWT. Por defecto, al arrancar se crea un usuario admin con credenciales USER_NAME/ADMIN_PASSWORD.

- Registrar usuario
```
curl -X POST http://localhost:3001/register \
    -H "Content-Type: application/json" \
    -d '{"username":"user1","password":"pass1"}'
```

- Login (admin o usuario registrado) — devuelve { token }
```
curl -X POST http://localhost:3001/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}'
```
Usa el token en el header: Authorization: Bearer <token>

## Endpoints

Públicos
- GET /ping
- GET /blocks
- GET /transactionPool
- GET /unspentTransactionOutputs
- GET /address?username=<name>
- POST /register
- POST /login

Protegidos (JWT)
- POST /sendTransaction (roles: admin, user)
- GET /balance (roles: admin, user)
- POST /mineBlock (role: admin)
- POST /mineRawBlock (role: admin)
- POST /mineTransaction (role: admin)
- GET /peers (role: admin)
- POST /addPeer (role: admin)

## Ejemplos de uso

Obtener bloques
```
curl http://localhost:3001/blocks
```

Login y uso de token (admin por defecto)
```
TOKEN=$(curl -s -X POST http://localhost:3001/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
```

Enviar transacción (requiere token y rol admin/user)
```
curl -X POST http://localhost:3001/sendTransaction \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"address": "046e33de7202ce47306f96e3f37d0e5eb00dccfc8494f4ae10d426baa78f3363fdffe837a2a34fe2ec9cb47d1224f926f6ceaa3639474dca700c6b4ed0306d4f5e", "amount": 20}'
```

Minar un bloque (role admin)
```
curl -X POST http://localhost:3001/mineBlock \
    -H "Authorization: Bearer $TOKEN"
```

Crear un bloque raw (role admin)
```
curl -X POST http://localhost:3001/mineRawBlock \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": [
            {
                "trIns": [{"signature":"","trOutId":"","trOutIndex":3}],
                "trOuts": [{"address":"04a50c897bcd0520f9746c1f0430e53a6188d89d03e653c5e10d97fd5f58c79f88608db0f7bb1145f39561722bb7e0a0886b58f70f4c4e5ab1e594eb360a42cf28","amount":50}],
                "id":"738d7e1cdfdfe147e74c0ded7c7d265f3047dd68cc7dc2e6cace8f5d03c7df66"
            }
        ]
    }'
```

Crear transacción y minarla en un bloque (role admin)
```
curl -X POST http://localhost:3001/mineTransaction \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","address":"04a50c897bcd0520f9746c1f0430e53a6188d89d03e653c5e10d97fd5f58c79f88608db0f7bb1145f39561722bb7e0a0886b58f70f4c4e5ab1e594eb360a42cf28","amount":30}'
```

Ver pool de transacciones
```
curl http://localhost:3001/transactionPool
```

Consultar balance (token requerido; balance del usuario del token)
```
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/balance
```

Dirección pública de un usuario
```
curl "http://localhost:3001/address?username=admin"
```

Peers (admin) y añadir peer
```
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/peers
curl -X POST http://localhost:3001/addPeer \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"peer":"ws://localhost:6002"}'
```

## Notas
- Los puertos por defecto son 3001 (HTTP) y 6001 (P2P). En Docker, cada nodo mapea 3001 a 3001/3002/3003 respectivamente.
- El secreto JWT (AUTH_SECRET) debería configurarse en producción; por defecto es un valor de desarrollo.
- Las wallets se almacenan en `wallets/*.json`. No uses estas claves en entornos reales.