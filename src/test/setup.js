import '@testing-library/jest-dom/vitest';

// jsdom não tem matchMedia; alguns componentes tocam nisso
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
  });
}
