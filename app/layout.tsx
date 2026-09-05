import "./globals.css";
import Link from "next/link";

export const metadata={title:"Proje Takip",description:"HP odaklı ve Kurumsal proje takip paneli"};

const iconStyle={width:22,height:22,flex:"0 0 auto",display:"block"} as const;
const stroke="#f7f3e9";

function OutlineSymbol({children,size=28}:{children:string;size?:number}){return <svg aria-hidden="true" viewBox="0 0 32 32" style={{...iconStyle,width:size,height:size,overflow:"visible"}}><text x="16" y="25" textAnchor="middle" fill="none" stroke={stroke} strokeWidth=".75" strokeLinejoin="round" paintOrder="stroke" style={{fontFamily:'"Segoe UI Symbol","Noto Sans Symbols 2","Arial Unicode MS",sans-serif',fontSize:27,fontWeight:400}}>{children}</text></svg>}
function SickleHammerIcon(){return <OutlineSymbol size={54}>☭</OutlineSymbol>}
function VictoryHandIcon(){return <OutlineSymbol size={29}>✌︎</OutlineSymbol>}

export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="tr"><body><div className="shell"><aside className="side"><div className="brand">PROJE TAKİP</div><nav><Link href="/">Dashboard</Link><div className="nav-category">HP ODAKLI PROJELER</div><div className="nav-children"><Link href="/projects/GF">GF Projeleri</Link><Link href="/projects/BF">BF Projeleri</Link><Link href="/monthly-hp">Aylık HP Takibi</Link><Link href="/search">HP Projelerinde Arama</Link><Link href="/import">HP Excel Yükle</Link><Link href="/imports">Yüklenen HP Dosyaları</Link></div><Link className="nav-category-link" href="/corporate">KURUMSAL</Link><div className="nav-children"><Link href="/corporate">Kurumsal Projeler</Link><Link href="/corporate/import">Kurumsal Excel Yükle</Link></div><Link href="/performance">EKİP PERFORMANSI</Link></nav><div aria-hidden="true" style={{marginTop:48,padding:"22px 0 38px",color:stroke,overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,whiteSpace:"nowrap",fontFamily:'"Segoe Script","Brush Script MT","Segoe Print","Bradley Hand",cursive',fontSize:17,fontWeight:500,fontStyle:"italic",lineHeight:1.15,letterSpacing:"-1px",transform:"rotate(-12deg)",transformOrigin:"center"}}><span>🌿</span><span>kendi halinde 1i</span><span>🕊️</span></div><div style={{marginTop:68,display:"flex",alignItems:"center",justifyContent:"center",gap:8,whiteSpace:"nowrap",fontFamily:'Impact,"Arial Narrow","Arial Black",sans-serif',fontSize:23,fontWeight:900,fontStyle:"italic",letterSpacing:".5px",lineHeight:1.05,transform:"rotate(-12deg)",transformOrigin:"center"}}><SickleHammerIcon/><span style={{color:"transparent",WebkitTextStroke:`1px ${stroke}`,textShadow:"none"}}>devrim şart</span><VictoryHandIcon/></div></div></aside><main className="main">{children}</main></div></body></html>
}
