import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service Worker Registration for PWA functionality
if ('serviceWorker' in navigator && window.self === window.top) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available, notify user
                  console.log('New content available! Please refresh the page.');
                  window.dispatchEvent(new CustomEvent('new-version-available'));
                } else {
                  // Content is cached for the first time
                  console.log('Content is cached for the first time!');
                }
              }
            });
          }
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
            console.log('Service Worker: New version available', event.data.version);
            window.dispatchEvent(new CustomEvent('new-version-available', {
              detail: { version: event.data.version }
            }));
          }
        });
        
        // Check for waiting service worker
        if (registration.waiting) {
          console.log('Service Worker: Waiting worker found, showing update banner');
          window.dispatchEvent(new CustomEvent('new-version-available'));
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
  
  // Handle service worker controller change (when new SW takes control)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker: Controller changed, reloading page');
    // Reload the page when a new service worker takes control
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);