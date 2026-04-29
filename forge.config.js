module.exports = {
  packagerConfig: {
    name: 'FlowMark Editor',
    executableName: 'FlowMark Editor',
    appBundleId: 'com.flowmark.editor',
    appCategoryType: 'public.app-category.productivity',
    asar: true
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'darwin-arm64']
    }
  ],
  plugins: []
};
