/**
 * Bookings Hub — one page surface for Client and Coach.
 *
 * Every file in this module is shared by both portals. Role differences are
 * expressed through the `role` prop on each component, never by copying or
 * forking the code.
 *
 * Components in this module keep the SAME look and behaviour in both portals
 * by design — a Coach student-card and a Client coach-card are the same
 * component; the data swaps, never the chrome.
 */
export { HubView } from './HubView';
