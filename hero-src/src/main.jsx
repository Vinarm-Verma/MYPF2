import React from 'react';
import { createRoot } from 'react-dom/client';
import Hero from './Hero.jsx';
import './hero.css';

// keep the hero flush under the fixed header, whatever height it wraps to
const header = document.querySelector('header.fixed');
if (header) {
  const setHdr = () => document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px');
  setHdr();
  new ResizeObserver(setHdr).observe(header);
}

const mount = document.getElementById('hero-root');
if (mount) {
  createRoot(mount).render(<Hero />);
  // the page's Lucide icons (arrow in the CTA) are created after React has rendered
  requestAnimationFrame(() => window.lucide && window.lucide.createIcons());
}

const contactMount = document.getElementById('contact-scene-root');
if (contactMount) {
  createRoot(contactMount).render(<Hero compact />);
}
