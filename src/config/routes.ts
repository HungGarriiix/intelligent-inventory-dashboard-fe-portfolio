// /src/config/routes.ts
// Central route + navigation config. Adding a screen = adding one entry here;
// the manager layout derives its nav from `navItems` and middleware protects
// all `/manager/:path*` — neither needs changes for a new screen.

export interface RouteConfig {
  path: string;
  label: string; // i18n key
  icon?: string; // MUI icon name
  navVisible: boolean;
}

export const routes = {
  login: {
    path: '/login',
    label: 'nav.login',
    navVisible: false,
  },
  inventory: {
    path: '/manager/inventory',
    label: 'nav.inventory',
    icon: 'DirectionsCar',
    navVisible: true,
  },
  agingStock: {
    path: '/manager/aging-stock',
    label: 'nav.agingStock',
    icon: 'Warning',
    navVisible: true,
  },
} satisfies Record<string, RouteConfig>;

export const navItems: RouteConfig[] = Object.values(routes).filter(
  (r) => r.navVisible,
);
