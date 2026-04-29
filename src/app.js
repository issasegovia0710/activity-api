const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const actividadesRoutes = require('./routes/actividadesRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.set('socketio', io);

app.use('/api/auth', authRoutes);
app.use('/api/actividades', actividadesRoutes);

app.get('/', (req, res) => {
  res.send('API Activity Modularizada');
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    mensaje: 'Ruta no encontrada',
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});