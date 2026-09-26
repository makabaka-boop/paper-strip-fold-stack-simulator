import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base 设为 /fold/：配合 nginx 在 /fold/ 路径下提供桌面工作台页面
export default defineConfig({
  base: '/fold/',
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
