export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Authentication is disabled for the public FinBrief demo deployment.
// Kept as a no-op for existing UI components that still call startLogin().
export const startLogin = () => {
  window.location.href = "/";
};
