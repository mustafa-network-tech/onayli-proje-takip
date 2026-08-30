import type { NextConfig } from "next";
import {PHASE_DEVELOPMENT_SERVER} from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";

initOpenNextCloudflareForDev();

export default function config(phase:string):NextConfig {
  return {
    distDir: phase===PHASE_DEVELOPMENT_SERVER?".next-dev":".next",
    serverExternalPackages:["@prisma/client",".prisma/client","pdf-parse"],
    webpack(webpackConfig){
      webpackConfig.resolve.alias={...webpackConfig.resolve.alias,pdfkit:path.resolve(process.cwd(),"lib/pdfkit-disabled.ts")};
      return webpackConfig;
    },
    experimental:{serverActions:{bodySizeLimit:"12mb"}}
  };
}
