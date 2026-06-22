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
})
