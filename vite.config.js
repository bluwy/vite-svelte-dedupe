import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  optimizeDeps: {
    // exclude: ['tinro'],
    esbuildOptions: {
      plugins: [
        {
          name: 'vite-test',
          setup(build) {
            // delete build.initialOptions.treeShaking
            // delete build.initialOptions.splitting
            // delete build.initialOptions.sourcemap
            // delete build.initialOptions.logLevel
            // build.initialOptions.plugins = []
            // console.log(build.initialOptions)
            // build.onResolve({
            //   filter: /.*/
            // }, (a) => {
            //   if (a.path.startsWith('svelte')) {
            //     console.log(a)
            //   }
            // })

            // if (build.initialOptions.external) {
            //   const filter = new RegExp(
            //     '^(' + build.initialOptions.external.map(s => s.replace(/[()[\]{}*+?^$|#.,\/\\\s-]/g, "\\$&")).join('|') + ')'
            //   )
            //   console.log(filter)
            //   build.onResolve({ filter }, (args) => {
            //     console.log(args)
            //     return {
            //       path: args.path,
            //       external: true,
            //     }
            //   })
            // }
          },
        },
      ],
      // external: ['svelte', 'svelte/*']
    },
  },
})
