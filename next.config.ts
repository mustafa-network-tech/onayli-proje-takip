import type { NextConfig } from "next";
import {PHASE_DEVELOPMENT_SERVER} from "next/constants";

export default function config(phase:string):NextConfig {
  return {
    distDir: phase===PHASE_DEVELOPMENT_SERVER?".next-dev":".next",
    serverExternalPackages:["pdf-parse","pdf-to-img","pdfkit","tesseract.js","@tesseract.js-data/tur"],
    experimental:{serverActions:{bodySizeLimit:"12mb"}}
  };
}
