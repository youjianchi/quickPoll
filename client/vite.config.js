import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: (() => {
    if (process.env.GITHUB_ACTIONS !== 'true') {
      return '/';
    }

    const repoName = process.env.GITHUB_REPOSITORY?.split('/')?.[1];
    return repoName ? `/${repoName}/` : '/';
  })(),
});
