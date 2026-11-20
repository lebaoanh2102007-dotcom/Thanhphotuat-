const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'client')));
const players = {};
const jobs = ['Cảnh sát','Cướp','Shipper','Bán hàng','Thợ sửa xe','Bác sĩ','Người dân'];
io.on('connection', socket => {
  socket.on('join', data => {
    const name = String(data?.name || 'Người chơi').slice(0,20);
    const job = jobs.includes(data?.job) ? data.job : 'Người dân';
    players[socket.id] = { id: socket.id, name, job, x: 0, z: 0, yaw: 0, color: job==='Cảnh sát'?'#2679ff':job==='Cướp'?'#d83d48':job==='Shipper'?'#25b86a':'#c78cff' };
    socket.emit('welcome', { id: socket.id, players });
    socket.broadcast.emit('playerJoined', players[socket.id]);
    io.emit('systemMessage', `${name} đã vào thành phố (${job})`);
  });
  socket.on('move', p => {
    if (!players[socket.id]) return;
    const x = Number(p?.x), z = Number(p?.z), yaw = Number(p?.yaw);
    if ([x,z,yaw].every(Number.isFinite)) {
      players[socket.id].x = Math.max(-300, Math.min(300, x));
      players[socket.id].z = Math.max(-300, Math.min(300, z));
      players[socket.id].yaw = yaw;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });
  socket.on('chat', text => {
    if (!players[socket.id]) return;
    const msg = String(text || '').trim().slice(0,160);
    if (msg) io.emit('chatMessage', { name: players[socket.id].name, text: msg, job: players[socket.id].job });
  });
  socket.on('disconnect', () => {
    if (players[socket.id]) {
      const name = players[socket.id].name;
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
      io.emit('systemMessage', `${name} đã rời thành phố`);
    }
  });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Thành Phố Tuất running on ${PORT}`));
