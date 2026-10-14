// open-next.config.ts file for @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});
config.buildCommand = "npm run build:next";

export default config;
