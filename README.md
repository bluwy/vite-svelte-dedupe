# vite-svelte-dedupe

Pre-bundled dependencies doesn't dedupe imports in external files. Specifically in this repo, Svelte files are the external files.

## Repro steps

1. `pnpm i`.
2. `pnpm dev`.
3. Go to http://localhost:3000.
4. Click on "To bar" link, text change to "Bar".
5. Refresh http://localhost:3000.
6. Click on "Go bar" button, text doesn't change (It should change to "Bar").

The problem is that the `tinro` dependency's code isn't deduped due to the use of Svelte files. Below explains the issue in detail, the main paragraph is [library not dedupe](#library-not-dedupe).

This is also not an issue within `tinro` as it works properly if we add it to `optimizeDeps.exclude`. `tinro` is used as the dependency to be pre-bundled.

> NOTE: The part below isn't relevant to the repro, but it documents some issues/learnings I find while fixing Vite + Svelte pre-bundling issue.

# Problem

In Vite + Svelte integration, some Svelte libraries needs to be excluded from optimization as Vite's pre-bundling process would bundle the Svelte's runtime all together. Svelte's runtime is a singleton so some functions like `setContext` would fail since it accesses to [global `current_component` variable](https://github.com/sveltejs/svelte/blob/c5f588ee50a50a77bb22ba006ee04f66795de74f/src/runtime/internal/lifecycle.ts#L3). Among other things.

# Goal

Dedupe Svelte dependency to ensure runtime is shared in pre-bundling and in user code.

# Travels

The pre-bundling process uses esbuild. Esbuild is ran twice by Vite, one for import scans, one for the actual pre-bundling. The focus is on the latter. [Here's the relevant code](https://github.com/vitejs/vite/blob/9abdb8137ef54dd095e7bc47ae6a1ccf490fd196/packages/vite/src/node/optimizer/index.ts#L262).

## external

At first glance, you would notice [`external: config.optimizeDeps?.exclude,`](https://github.com/vitejs/vite/blob/9abdb8137ef54dd095e7bc47ae6a1ccf490fd196/packages/vite/src/node/optimizer/index.ts#L266). One would assume that since `vite-plugin-svelte` excludes [Svelte's import paths](https://github.com/sveltejs/vite-plugin-svelte/blob/09b63d32e8816acc554a66d4d01062be197dfbb7/packages/vite-plugin-svelte/src/index.ts#L61) (`svelte`, `svelte/store`, etc), ideally the generated pre-bundled file would not bundle the Svelte library.

Turns out this is not true, not because of esbuild, but because of Vite's [`esbuildDepsPlugin`](https://github.com/vitejs/vite/blob/9abdb8137ef54dd095e7bc47ae6a1ccf490fd196/packages/vite/src/node/optimizer/esbuildDepPlugin.ts). The issue is that Vite applies a [custom resolver algorithm](https://github.com/vitejs/vite/blob/9abdb8137ef54dd095e7bc47ae6a1ccf490fd196/packages/vite/src/node/optimizer/esbuildDepPlugin.ts#L103-L138) over esbuild's, which indirectly affects what dependency gets externalized. In other words, only dependencies which can't be resolved are externalized (Not sure if there's any use for this behaviour).

## patch external

We could apply a patch to the issue above by adding this code below [this line](https://github.com/vitejs/vite/blob/9abdb8137ef54dd095e7bc47ae6a1ccf490fd196/packages/vite/src/node/optimizer/esbuildDepPlugin.ts#L134):

```js
external: build.initialOptions.external?.includes(id)
```

Now, external will be respected.

> You might notice the bundled code has [repeated imports](https://github.com/evanw/esbuild/issues/475) by esbuild, though this is harmless in our scenario).

However, this patch doesn't work in the big picture, because:

1. In user code, Vite transforms the Svelte import path to, e.g. `/node_modules/.pnpm/svelte@3.38.2/node_modules/svelte/index.mjs?v=abc123`
2. In pre-bundled code, the import path is, e.g. `/node_modules/.pnpm/svelte@3.38.2/node_modules/svelte/index.mjs`

The query string returns two different Svelte instance for each requested script. This may explain why Vite intentionally affect the external algorithm.

**This route doesn't work.**

## optimize svelte

Taking a step back, what if we include Svelte libraries into the pre-bundling process, that way bundled code and user code can reference the same Svelte instance.

A change in vite-plugin-svelte is needed by adding `svelte` and `svelte/*` imports in `optimizeDeps.include`, the Svelte instance is successfully deduped. Checking the network request, I can confirm the Svelte library is only requested once (deduped).

But there still exist an odd behaviour. The victim I used, `tinro`, still isn't working properly when calling `router.goto`, the route won't get updated.

**There is another problem.**

## library not dedupe

After countless hours of debugging, finally my eye was caught on an oddity in the "Sources" tab. First you would have to understand tinro's build directory, https://www.jsdelivr.com/package/npm/tinro.

The notable files are `cmp/Route.svelte`, `cmp/index.js`, and `dist/tinro_lib.js`. Take a look at the contents of the first two files.

When Vite optimizes this (entrypoint `cmp/index.js`), Vite will [ignore Svelte file extensions](https://github.com/vitejs/vite/blob/9aa255a0abcb9f5b23c34607b2188f796f4b6c94/packages/vite/src/node/optimizer/esbuildDepPlugin.ts#L71-L85) (among other types) in the bundle, make sense as we shouldn't bundle Svelte components.

But there's a problem, taking a look at `cmp/Route.svelte`, you'll notice that it imports a path to `./../dist/tinro_lib`. Going back to the running Vite app, the network request shows that it's not importing from the pre-bundled `tinro.js` file in `.vite`.

```js
// http://localhost:3000/node_modules/.pnpm/tinro@0.6.4/node_modules/tinro/cmp/Route.svelte

// ...

import { createRouteObject } from '/node_modules/.pnpm/tinro@0.6.4/node_modules/tinro/dist/tinro_lib.js'

//...
```

`tinro`'s code is now duplicated between `tinro_lib.js` and `tinro.js`, and this **fails dedupe for the library itself**, not Svelte anymore. This is likely the root cause why some Svelte libraries work oddly.

# Solution

Based on the root cause, this happens to any extensions [listed here](https://github.com/vitejs/vite/blob/9aa255a0abcb9f5b23c34607b2188f796f4b6c94/packages/vite/src/node/optimizer/esbuildDepPlugin.ts#L15-L32). I have not tested this on other extensions like `.vue` or `.tsx` as these files are usually compiled in library builds.

I don't have a solid strategy to tackle this, but one naive implementation would be to scan these subpaths as entrypoints for the pre-bundling, so esbuild would generate the chunks for these files to use.
