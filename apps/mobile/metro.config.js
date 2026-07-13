// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const config = getDefaultConfig(__dirname);

// pnpm 모노레포: packages/shared가 자체 devDependency 복사본(react@18 피어 컨텍스트)을
// 해석해 React Query 컨텍스트가 이중 인스턴스가 되는 문제("No QueryClient set") 방지.
// 컨텍스트를 쓰는 라이브러리는 앱 복사본으로 강제 단일화한다.
const SINGLETONS = ['react', 'react-dom', '@tanstack/react-query'];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSingleton = SINGLETONS.some(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`),
  );
  if (isSingleton) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(__dirname, 'package.json') },
      moduleName,
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
