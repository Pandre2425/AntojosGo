const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')
const config = getDefaultConfig(__dirname)
const workspaceRoot = path.resolve(__dirname, '..')
config.watchFolders = ['shared', 'modules', 'lib'].map(folder => path.resolve(workspaceRoot, folder))
// Prefer the app's node_modules; fall back to workspace root (pnpm hoist).
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true
module.exports = config