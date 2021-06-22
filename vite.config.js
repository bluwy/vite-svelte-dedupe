import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const SVELTE_IMPORTS = [
  'svelte/animate',
  'svelte/easing',
  'svelte/internal',
  'svelte/motion',
  'svelte/store',
  'svelte/transition',
  'svelte',
]

export default defineConfig({
  plugins: [
    svelte(),
    // Optimize svelte imports to dedupe Svelte
    patchSvelte(),
  ],
})

function patchSvelte() {
  return {
    name: 'svelte:patch',
    config(cfg) {
      // Remove svelte imports added by vite-plugin-svelte
      if (cfg.optimizeDeps?.exclude) {
        cfg.optimizeDeps.exclude = cfg.optimizeDeps.exclude.filter(
          (dep) => !SVELTE_IMPORTS.includes(dep)
        )
      }

      return {
        optimizeDeps: {
          include: [...SVELTE_IMPORTS],
        },
      }
    },
  }
}
