// vite.config.js
import { defineConfig } from "file:///C:/DEV/react3js/game-money/node_modules/vite/dist/node/index.js";
import react from "file:///C:/DEV/react3js/game-money/node_modules/@vitejs/plugin-react/dist/index.mjs";
import mkcert from "file:///C:/DEV/react3js/game-money/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), mkcert()],
  server: {
    host: true,
    https: true,
    port: 5173,
    proxy: {
      // Resolve CORS do avatar API chamando via mesma origem do Vite
      "/api": {
        target: "https://nodejs-passport-login-master.onrender.com",
        changeOrigin: true,
        secure: false,
        // remove /api e deixa a rota bater com /api/* do backend
        rewrite: (path) => path.replace(/^\/api/, "/api")
      }
    }
  },
  optimizeDeps: {
    include: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/rapier"
    ],
    exclude: ["@react-three/xr"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxERVZcXFxccmVhY3QzanNcXFxcZ2FtZS1tb25leVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcREVWXFxcXHJlYWN0M2pzXFxcXGdhbWUtbW9uZXlcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L0RFVi9yZWFjdDNqcy9nYW1lLW1vbmV5L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IG1rY2VydCBmcm9tICd2aXRlLXBsdWdpbi1ta2NlcnQnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgbWtjZXJ0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIGh0dHBzOiB0cnVlLFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgIC8vIFJlc29sdmUgQ09SUyBkbyBhdmF0YXIgQVBJIGNoYW1hbmRvIHZpYSBtZXNtYSBvcmlnZW0gZG8gVml0ZVxuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vbm9kZWpzLXBhc3Nwb3J0LWxvZ2luLW1hc3Rlci5vbnJlbmRlci5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIC8vIHJlbW92ZSAvYXBpIGUgZGVpeGEgYSByb3RhIGJhdGVyIGNvbSAvYXBpLyogZG8gYmFja2VuZFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJy9hcGknKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgJ3RocmVlJyxcbiAgICAgICdAcmVhY3QtdGhyZWUvZmliZXInLFxuICAgICAgJ0ByZWFjdC10aHJlZS9kcmVpJyxcbiAgICAgICdAcmVhY3QtdGhyZWUvcmFwaWVyJ1xuICAgIF0sXG4gICAgZXhjbHVkZTogWydAcmVhY3QtdGhyZWUveHInXSxcbiAgfSxcbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdRLFNBQVMsb0JBQW9CO0FBQ3JTLE9BQU8sV0FBVztBQUNsQixPQUFPLFlBQVk7QUFFbkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7QUFBQSxFQUMzQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQSxNQUVMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQTtBQUFBLFFBRVIsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLFVBQVUsTUFBTTtBQUFBLE1BQ2xEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLGlCQUFpQjtBQUFBLEVBQzdCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
