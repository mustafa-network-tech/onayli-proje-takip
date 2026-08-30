export function manufacturing(b:{cableCompleted:boolean;spliceCompleted:boolean;obkCompleted:boolean},type:string){const done=(b.cableCompleted?1:0)+(b.spliceCompleted?1:0)+(type==="BF"&&b.obkCompleted?1:0);const total=type==="BF"?3:2;return {percent:Math.round(done/total*100),status:done===0?"Başlanmadı":done===total?"Tamamlandı":"Devam Ediyor"};}

export function hpWeightedProgress(buildings:Array<{bbkHp:number;cableCompleted:boolean;spliceCompleted:boolean;obkCompleted:boolean}>,type:string){
  const totalHp=buildings.reduce((sum,b)=>sum+Math.max(0,b.bbkHp),0);
  if(totalHp===0)return 0;
  const totalSteps=type==="BF"?3:2;
  const ratio=(b:{cableCompleted:boolean;spliceCompleted:boolean;obkCompleted:boolean})=>((b.cableCompleted?1:0)+(b.spliceCompleted?1:0)+(type==="BF"&&b.obkCompleted?1:0))/totalSteps;
  const weighted=buildings.reduce((sum,b)=>sum+(Math.max(0,b.bbkHp)*ratio(b)),0);
  const allComplete=buildings.every(b=>ratio(b)===1);
  if(allComplete)return 100;
  return Math.min(99.9,Math.round((weighted/totalHp*100)*10)/10);
}

export const formatProgress=(value:number)=>value.toFixed(1);
