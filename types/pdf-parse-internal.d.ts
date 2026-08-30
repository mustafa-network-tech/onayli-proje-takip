declare module "pdf-parse/lib/pdf-parse.js" {
  type Result={text:string;numPages:number;numrender:number;info:Record<string,unknown>;metadata:unknown;version:string};
  export default function pdf(dataBuffer:Buffer,options?:Record<string,unknown>):Promise<Result>;
}
