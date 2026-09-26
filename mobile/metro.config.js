const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')
const config = getDefaultConfig(__dirname)
config.watchFolders = ['shared', 'modules', 'lib'].map(folder => path.resolve(__dirname, '..', folder))
// Shared modules must use the same React/SDK installation as the native app.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]
config.resolver.disableHierarchicalLookup = true
module.exports = config
