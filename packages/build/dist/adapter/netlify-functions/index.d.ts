import { Plugin } from 'vite';
import { BuildOptions } from '../../base.js';
import '../../entry/index.js';

type NetlifyFunctionsBuildOptions = BuildOptions;
declare function netlifyFunctionsBuildPlugin(pluginOptions?: NetlifyFunctionsBuildOptions): Plugin;

export { NetlifyFunctionsBuildOptions, netlifyFunctionsBuildPlugin as default };
