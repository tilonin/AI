import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],server:{proxy:{'/api':'http://127.0.0.1:3001'}},build:{chunkSizeWarningLimit:2500,rollupOptions:{output:{manualChunks:{physics:["@dimforge/rapier3d-compat"],graphics:["three","@react-three/fiber","@react-three/drei","@react-three/rapier"],interface:["framer-motion","lucide-react"]}}}}});
