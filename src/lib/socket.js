/**
 * Socket.IO Client — singleton connection to the backend.
 *
 * Architecture:
 * ┌────────────────────────────────────────────────────────┐
 * │  SocketProvider (React Context)                        │
 * │     │                                                   │
 * │     ├── Auto-connects on mount                          │
 * │     ├── Joins business room on businessId change       │
 * │     ├── Exposes { socket, connected } via useSocket()  │
 * │     └── Cleans up on unmount                            │
 * │                                                         │
 * │  useSocketEvent(event, handler)                         │
 * │     ├── Subscribes to a specific socket event           │
 * │     └── Auto-cleans on unmount (no leaks)               │
 * │                                                         │
 * │  Store listeners (useSocketRefresh)                     │
 * │     ├── Connects socket events → zustand store refresh  │
 * │     └── e.g. 'products:created' → loadProducts()       │
 * └────────────────────────────────────────────────────────┘
 */
import { io } from 'socket.io-client';

const SOCKET_URL = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SOCKET_URL
  ? process.env.NEXT_PUBLIC_SOCKET_URL
  : (typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':3001') : 'http://localhost:3001');

let socket = null;

/**
 * Get or create the singleton socket instance.
 * @param {object} [opts]
 * @param {number|string} [opts.businessId]
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket(opts = {}) {
  if (socket) return socket;

  const auth = {};
  if (opts.businessId) auth.businessId = opts.businessId;
  if (opts.role) auth.role = opts.role;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Disconnect and destroy the socket singleton.
 */
export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Switch to a different business room.
 * @param {number|string} businessId
 */
export function joinBusiness(businessId) {
  if (socket?.connected) {
    socket.emit('join:business', businessId);
  }
}

export default getSocket;
