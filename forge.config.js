module.exports = {
  packagerConfig: {
    name: 'FlowMark Editor',
    executableName: 'FlowMark Editor',
    appBundleId: 'com.flowmark.editor',
    appCategoryType: 'public.app-category.productivity',
    asar: true,
    ignore: (path) => {
      if (path === '') return false;
      if (/^\/\.(git|claude)/.test(path)) return true;
      if (/^\/(dist|out|test|test-results|node_modules\/\.package-lock\.json)/.test(path)) return true;
      if (/node_modules\/.*\/test/.test(path)) return true;
      if (/node_modules\/.*\/__tests__/.test(path)) return true;
      if (/node_modules\/.*\/coverage/.test(path)) return true;
      if (/node_modules\/jest/.test(path)) return true;
      if (/node_modules\/@types/.test(path)) return true;
      if (/node_modules\/playwright/.test(path)) return true;
      if (/\.(md|yml|yaml)$/.test(path) && !/node_modules/.test(path)) return true;
      if (/jest\.config\.js$/.test(path)) return true;
      if (/playwright\.config\.js$/.test(path)) return true;
      if (/forge\.config\.js$/.test(path)) return true;
      if (/tsconfig/.test(path)) return true;
      return false;
    }
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
