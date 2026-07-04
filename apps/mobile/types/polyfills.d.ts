declare module 'react-native-polyfill-globals/src/fetch';
declare module 'react-native-polyfill-globals/src/readable-stream';
declare module 'react-native/Libraries/Utilities/PolyfillFunctions' {
  export function polyfillGlobal(
    name: string,
    getValue: () => unknown
  ): void;
}
