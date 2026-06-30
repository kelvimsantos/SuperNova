// vite.config.js
import { defineConfig } from "file:///C:/DEV/react3js/game-money/node_modules/vite/dist/node/index.js";
import react from "file:///C:/DEV/react3js/game-money/node_modules/@vitejs/plugin-react/dist/index.mjs";
import mkcert from "file:///C:/DEV/react3js/game-money/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), mkcert()],
  server: {
    host: true,
    https: true,
    port: 5173
  },
  optimizeDeps: {
    include: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/rapier"
      // <-- adicionado
    ],
    exclude: ["@react-three/xr"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxERVZcXFxccmVhY3QzanNcXFxcZ2FtZS1tb25leVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcREVWXFxcXHJlYWN0M2pzXFxcXGdhbWUtbW9uZXlcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L0RFVi9yZWFjdDNqcy9nYW1lLW1vbmV5L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBta2NlcnQgZnJvbSAndml0ZS1wbHVnaW4tbWtjZXJ0JztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCksIG1rY2VydCgpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IHRydWUsXHJcbiAgICBodHRwczogdHJ1ZSxcclxuICAgIHBvcnQ6IDUxNzMsXHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFtcclxuICAgICAgJ3RocmVlJyxcclxuICAgICAgJ0ByZWFjdC10aHJlZS9maWJlcicsXHJcbiAgICAgICdAcmVhY3QtdGhyZWUvZHJlaScsXHJcbiAgICAgICdAcmVhY3QtdGhyZWUvcmFwaWVyJyAgIC8vIDwtLSBhZGljaW9uYWRvXHJcbiAgICBdLFxyXG4gICAgZXhjbHVkZTogWydAcmVhY3QtdGhyZWUveHInXSxcclxuICB9LFxyXG59KTtcclxuXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1EsU0FBUyxvQkFBb0I7QUFDclMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sWUFBWTtBQUVuQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztBQUFBLEVBQzNCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxJQUNQLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLGlCQUFpQjtBQUFBLEVBQzdCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
