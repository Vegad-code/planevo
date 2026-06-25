import 'react-native-url-polyfill/auto';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { ReadableStream } from 'web-streams-polyfill';
import { polyfillGlobal } from 'react-native/Libraries/Utilities/PolyfillFunctions';

polyfillFetch();

if (typeof global.ReadableStream === 'undefined') {
  polyfillGlobal('ReadableStream', () => ReadableStream);
}
