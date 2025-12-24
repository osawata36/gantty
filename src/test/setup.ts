import "@testing-library/jest-dom";

// Mock ResizeObserver for Radix UI components
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
