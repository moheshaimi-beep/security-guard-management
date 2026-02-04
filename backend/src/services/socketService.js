const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;
const connectedUsers = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Store connected user
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      role: socket.userRole,
      connectedAt: new Date()
    });

    // Join role-based rooms
    socket.join(`role:${socket.userRole}`);
    socket.join(`user:${socket.userId}`);

    // Broadcast online users count
    broadcastOnlineUsers();

    // Handle location updates
    socket.on('location:update', async (data) => {
      try {
        const { latitude, longitude } = data;

        // Update user location in database
        const { User } = require('../models');
        await User.update(
          {
            currentLatitude: latitude,
            currentLongitude: longitude,
            lastLocationUpdate: new Date()
          },
          { where: { id: socket.userId } }
        );

        // Broadcast to admins and supervisors
        io.to('role:admin').to('role:supervisor').emit('agent:location', {
          userId: socket.userId,
          latitude,
          longitude,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Handle check-in notifications
    socket.on('checkin:notify', (data) => {
      io.to('role:admin').to('role:supervisor').emit('checkin:new', {
        ...data,
        timestamp: new Date()
      });
    });

    // Handle incident reports
    socket.on('incident:report', (data) => {
      io.to('role:admin').to('role:supervisor').emit('incident:new', {
        ...data,
        reportedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle SOS alerts
    socket.on('sos:trigger', async (data) => {
      const { User } = require('../models');
      const user = await User.findByPk(socket.userId);

      io.to('role:admin').to('role:supervisor').emit('sos:alert', {
        userId: socket.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        location: data.location,
        message: data.message,
        timestamp: new Date(),
        priority: 'critical'
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
      broadcastOnlineUsers();
    });
  });

  return io;
};

const broadcastOnlineUsers = () => {
  if (io) {
    const onlineAgents = Array.from(connectedUsers.entries())
      .filter(([_, data]) => data.role === 'agent')
      .map(([userId, data]) => ({ userId, ...data }));

    io.to('role:admin').to('role:supervisor').emit('users:online', {
      total: connectedUsers.size,
      agents: onlineAgents.length,
      list: onlineAgents
    });
  }
};

const sendNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

const sendToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

const broadcastToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const getOnlineUsers = () => {
  return Array.from(connectedUsers.entries()).map(([userId, data]) => ({
    userId,
    ...data
  }));
};

module.exports = {
  initializeSocket,
  sendNotification,
  sendToRole,
  broadcastToAll,
  getOnlineUsers
};
