const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro sees packages/shared
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure @styl/shared resolves to the actual source (not a symlink)
config.resolver.extraNodeModules = {
  '@styl/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

// Don't follow symlinks — resolve from extraNodeModules instead
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
