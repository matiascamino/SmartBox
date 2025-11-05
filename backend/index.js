// index.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import eventosRoute from './routes/eventos.js'
import pinRoute from './routes/pin.js';


dotenv.config()

const app = express()
app.use(cors({
  origin: '*'
}));
app.use(express.json())

app.use('/api/eventos', eventosRoute)
app.use('/api/auth', pinRoute);

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`)
})

