import jwt from 'jsonwebtoken'
const AUTH_SECRET = process.env.AUTH_SECRET || 'TODO_changeInYourNode';

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).send('Token faltante')

  const token = authHeader.split(' ')[1]
  jwt.verify(token, AUTH_SECRET, (err, user) => {
    if (err) return res.status(403).send('Token inválido')
    req.user = user
    next()
  })
}
