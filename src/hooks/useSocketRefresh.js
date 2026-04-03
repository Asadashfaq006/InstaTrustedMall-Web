'use client';
/**
 * useSocketRefresh — Connects socket events to zustand store refreshes.
 *
 * When the backend emits 'products:created', 'demands:confirmed', etc.,
 * this hook automatically reloads the relevant store data.
 *
 * Place this hook once at the app root (e.g. inside providers or layout).
 */
import { useEffect, useRef } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import useBusinessStore from '@/stores/businessStore';
import useProductStore from '@/stores/productStore';
import useBuyerStore from '@/stores/buyerStore';
import useDemandStore from '@/stores/demandStore';

// Debounce helper — prevents rapid-fire reloads when many events arrive at once
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function useSocketRefresh() {
  const { socket } = useSocket();
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const businessId = activeBusiness?.id;

  // Keep refs so debounced functions use latest store methods
  const loadProducts = useProductStore((s) => s.loadProducts);
  const loadBuyers = useBuyerStore((s) => s.loadBuyers);
  const loadDemands = useDemandStore((s) => s.loadDemands);
  const loadActive = useBusinessStore((s) => s.loadActive);

  const refsRef = useRef({});
  refsRef.current = { loadProducts, loadBuyers, loadDemands, loadActive, businessId };

  useEffect(() => {
    if (!socket || !businessId) return;

    // Debounced refreshers (300ms window)
    const refreshProducts = debounce(() => {
      const { loadProducts, businessId } = refsRef.current;
      if (businessId) loadProducts(businessId);
    }, 300);

    const refreshBuyers = debounce(() => {
      const { loadBuyers, businessId } = refsRef.current;
      if (businessId && loadBuyers) loadBuyers(businessId);
    }, 300);

    const refreshDemands = debounce(() => {
      const { loadDemands, businessId } = refsRef.current;
      if (businessId && loadDemands) loadDemands(businessId);
    }, 300);

    const refreshBusiness = debounce(() => {
      refsRef.current.loadActive();
    }, 300);

    // Product events
    const productEvents = ['products:created', 'products:updated', 'products:deleted', 'products:restored', 'products:imported'];
    productEvents.forEach((e) => socket.on(e, refreshProducts));

    // Buyer events
    const buyerEvents = ['buyers:created', 'buyers:updated', 'buyers:archived', 'buyers:restored', 'buyers:deleted'];
    buyerEvents.forEach((e) => socket.on(e, refreshBuyers));

    // Demand events (also refresh buyers since balances may change)
    const demandEvents = ['demands:created', 'demands:updated', 'demands:confirmed', 'demands:cancelled', 'demands:deleted', 'demands:reopened'];
    demandEvents.forEach((e) => {
      socket.on(e, refreshDemands);
      socket.on(e, refreshBuyers);
    });

    // Payment events
    const paymentEvents = ['payments:created', 'payments:deleted'];
    paymentEvents.forEach((e) => {
      socket.on(e, refreshDemands);
      socket.on(e, refreshBuyers);
    });

    // Stock events → refresh products too (stock → product values)
    const stockEvents = ['stock:adjusted'];
    stockEvents.forEach((e) => {
      socket.on(e, refreshProducts);
    });

    // Business events
    const businessEvents = ['business:created', 'business:updated', 'business:activated', 'business:deleted'];
    businessEvents.forEach((e) => socket.on(e, refreshBusiness));

    return () => {
      // Clean up all listeners
      [...productEvents, ...buyerEvents, ...demandEvents, ...paymentEvents, ...stockEvents, ...businessEvents].forEach((e) => {
        socket.off(e);
      });
    };
  }, [socket, businessId]);
}
