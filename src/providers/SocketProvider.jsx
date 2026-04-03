'use client';
/**
 * SocketProvider — React context that manages the Socket.IO lifecycle.
 *
 * Wraps the app and provides:
 *   useSocket()       → { socket, connected }
 *   useSocketEvent()  → subscribe to a single event
 *   useSocketRefresh()→ auto-refresh zustand stores on server events
 */
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSocket, destroySocket, joinBusiness } from '@/lib/socket';
import useBusinessStore from '@/stores/businessStore';
import usePlatformAuthStore from '@/stores/platformAuthStore';

// ── Context ──────────────────────────────────────────
const SocketContext = createContext({ socket: null, connected: false });

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Subscribe to a socket event. Auto-cleans on unmount.
 * @param {string} event      e.g. 'products:created'
 * @param {Function} handler  Callback receiving the payload
 */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !event) return;
    const listener = (data) => savedHandler.current(data);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

// ── Provider ─────────────────────────────────────────
export default function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const pathname = usePathname();
  const platformUser = usePlatformAuthStore((s) => s.user);
  const appliedRoleRef = useRef(null);

  const isPlatformPage = pathname?.startsWith('/super-admin') || pathname?.startsWith('/admin');

  // Connect once on mount
  useEffect(() => {
    const businessId = activeBusiness?.id;
    const role = isPlatformPage ? platformUser?.role : undefined;

    const s = getSocket({ businessId, role });
    if (role) appliedRoleRef.current = role;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (!s.connected) s.connect();
    setSocket(s);
    setConnected(s.connected);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  // Reconnect with role when entering platform pages — only if role changed
  useEffect(() => {
    if (!isPlatformPage || !platformUser?.role || !socket) return;
    // Skip if the role is already applied (avoids unnecessary disconnect/reconnect)
    if (appliedRoleRef.current === platformUser.role) return;

    socket.auth = { ...socket.auth, role: platformUser.role };
    appliedRoleRef.current = platformUser.role;

    if (socket.connected) {
      socket.disconnect().connect();
    } else {
      socket.connect();
    }
  }, [isPlatformPage, platformUser?.role, socket]);

  // Switch room when active business changes
  useEffect(() => {
    if (activeBusiness?.id && socket?.connected) {
      joinBusiness(activeBusiness.id);
    }
  }, [activeBusiness?.id, socket]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
