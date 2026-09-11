// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock de matchMedia. El modo Sistema de RF-27 se suscribe a `change` para seguir a
// `prefers-color-scheme`, asi que el stub necesita la API moderna de EventTarget; el
// anterior solo tenia `addListener` y cualquier suscripcion reventaba en pruebas.
window.matchMedia = window.matchMedia || function (query: string) {
  return {
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    addListener: () => {},
    removeListener: () => {},
  } as unknown as MediaQueryList;
};
