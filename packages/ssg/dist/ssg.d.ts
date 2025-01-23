import { Plugin } from 'vite';

type SSGOptions = {
    entry?: string;
};
declare const defaultOptions: Required<SSGOptions>;
declare const ssgBuild: (options?: SSGOptions) => Plugin;

export { defaultOptions, ssgBuild };
