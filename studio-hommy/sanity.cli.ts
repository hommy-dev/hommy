import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'v6wykinx',
    dataset: 'production',
  },
  /**
   * Enable auto-updates for studios so they always run the latest published
   * version of the Studio toolchain without a manual dependency bump.
   */
  deployment: {autoUpdates: true},
  /**
   * TypeGen scans the Next.js app's `defineQuery` calls and emits typed results
   * to src/sanity.types.ts (inside the app, so `@/sanity.types` resolves and the
   * app tsconfig includes it). `overloadClientMethods` makes client.fetch and
   * next-sanity's `sanityFetch` return typed results automatically.
   *
   *   cd studio-hommy && npm run typegen   # schema extract + type generate
   */
  typegen: {
    enabled: true,
    schema: 'schema.json',
    path: '../src/**/*.{ts,tsx,js,jsx}',
    generates: '../src/sanity.types.ts',
    overloadClientMethods: true,
  },
})
