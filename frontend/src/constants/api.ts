export const API_PATHS = {
  login: "/api/login",
  logout: "/api/logout",
  me: "/api/me",
  orders: "/api/orders",
  orderStats: "/api/orders/stats",
} as const;

export const QUERY_KEYS = {
  me: ["me"],
  orders: ["orders"],
} as const;
