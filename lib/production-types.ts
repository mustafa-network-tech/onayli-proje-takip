export type ProductionUnit="METRE"|"ADET";
export type ProductionEntryInput={teamName:string;category:string;subtype:string|null;cableCapacity:number|null;cableFamily:"FOY"|"FOH"|null;quantity:number;unit:ProductionUnit;originalText:string};
export type UnknownProductionLine={teamName:string|null;text:string;reason:string};
export type ProductionPreview={fileName:string;fingerprint:string;workDate:string;teams:string[];entries:ProductionEntryInput[];unknown:UnknownProductionLine[];ignored:string[];duplicate:boolean};
