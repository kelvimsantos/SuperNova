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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxERVZcXFxccmVhY3QzanNcXFxcZ2FtZS1tb25leVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcREVWXFxcXHJlYWN0M2pzXFxcXGdhbWUtbW9uZXlcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L0RFVi9yZWFjdDNqcy9nYW1lLW1vbmV5L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IG1rY2VydCBmcm9tICd2aXRlLXBsdWdpbi1ta2NlcnQnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgbWtjZXJ0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIGh0dHBzOiB0cnVlLFxuICAgIHBvcnQ6IDUxNzMsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICd0aHJlZScsXG4gICAgICAnQHJlYWN0LXRocmVlL2ZpYmVyJyxcbiAgICAgICdAcmVhY3QtdGhyZWUvZHJlaScsXG4gICAgICAnQHJlYWN0LXRocmVlL3JhcGllcicgICAvLyA8LS0gYWRpY2lvbmFkb1xuICAgIF0sXG4gICAgZXhjbHVkZTogWydAcmVhY3QtdGhyZWUveHInXSxcbiAgfSxcbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdRLFNBQVMsb0JBQW9CO0FBQ3JTLE9BQU8sV0FBVztBQUNsQixPQUFPLFlBQVk7QUFFbkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7QUFBQSxFQUMzQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQTtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVMsQ0FBQyxpQkFBaUI7QUFBQSxFQUM3QjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
