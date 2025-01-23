import { getPlatformProxy } from 'wrangler';
import { Adapter } from '../types.js';
import 'vite';

type CloudflareAdapterOptions = {
    proxy: Parameters<typeof getPlatformProxy>[0];
};
declare const cloudflareAdapter: (options?: CloudflareAdapterOptions) => Promise<Adapter>;

export { cloudflareAdapter, cloudflareAdapter as default };
