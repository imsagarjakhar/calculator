import { useId, useState, type CSSProperties } from "react";
import { lessonTimeline } from "../content/financeBasics";
import { currencies, useCurrency } from "../runtime/currency";
import "../styles/payday-challenge.css";

const budget=1000;
const colors={Needs:"#8554ad",Wants:"#c15a23",Investment:"#19766c"};
function project(monthly:number,years:number,rate:number,drawYears:number){
  const saving=lessonTimeline("sip",{amount:monthly,years,rate,withdrawal:0}).rows;
  const peak=saving[saving.length-1].balance;
  const months=drawYears*12, r=rate/1200;
  const payout=r===0?peak/months:peak*r/-Math.expm1(-months*Math.log1p(r));
  const drawing=lessonTimeline("swp",{amount:peak,years:drawYears,rate,withdrawal:payout}).rows;
  return {peak,payout,points:[...saving,...drawing.slice(1)].filter((_,i)=>i%12===0).map(row=>row.balance)};
}
type Projection=ReturnType<typeof project>;
function Trend({original,alternative,years,drawYears,money}:{original:Projection;alternative:Projection|null;years:number;drawYears:number;money:(n:number)=>string}){
  const top=Math.max(original.peak,alternative?.peak??0,1);
  const x=(i:number)=>8+i*350/(years+drawYears);
  const y=(v:number)=>104-95*v/top;
  const line=(p:Projection)=>p.points.map((v,i)=>(i?"L":"M")+x(i)+" "+y(v)).join(" ");
  return <figure className="pay-trend"><figcaption><span>Projected balance</span><span>{money(Math.max(original.peak,alternative?.peak??0))} peak</span></figcaption>
    <svg viewBox="0 0 366 114" role="img" aria-label={`Balance rises during ${years} years of deposits, then is drawn down over ${drawYears} years. Spend-first peak ${money(original.peak)}.${alternative?" Invest-first peak "+money(alternative.peak)+".":""}`}>
      {[12,58,104].map(v=><path key={v} d={`M8 ${v}H358`} stroke="#e6dfee" fill="none"/>)}
      <path d={line(alternative??original)+" L358 104 H8 Z"} fill={alternative?"#e1f2ec":"#eee6f8"}/>
      <path d={`M${x(years)} 5V104`} stroke="#877a93" strokeDasharray="2 4"/>
      <path d={line(original)} fill="none" stroke="#8051a5" strokeWidth="3" strokeDasharray={alternative?"5 4":undefined}/>
      {alternative&&<path d={line(alternative)} fill="none" stroke="#19766c" strokeWidth="3"/>}
    </svg>
    <div className="pay-axis"><span>Today</span><span>SIP ends · yr {years}</span><span>Yr {years+drawYears}</span></div>
    <div className="pay-key"><span>Spend first</span>{alternative&&<span>Invest first</span>}</div></figure>;
}
function Slider({label,value,max,onChange,money}:{label:keyof typeof colors;value:number;max:number;onChange:(n:number)=>void;money:(n:number)=>string}){
  const id=useId();
  return <div className="pay-slider" style={{"--tone":colors[label],"--fill":(max?100*value/max:0)+"%"} as CSSProperties}>
    <label htmlFor={id}>{label}<strong>{money(value)}</strong></label>
    <input id={id} type="range" min="0" max={max} step="10" value={value} disabled={max===0} aria-valuetext={money(value)} onChange={e=>onChange(Number(e.target.value))}/>
  </div>;
}
export function PaydayChallenge(){
  const currency=useCurrency();
  const symbol=currencies.find(([code])=>code===currency)![1];
  const money=(n:number)=>symbol+(/^[\u0600-\u06ff]/.test(symbol)?" ":"")+new Intl.NumberFormat(currency==="INR"?"en-IN":"en-US",{maximumFractionDigits:0}).format(n);
  const [needs,setNeeds]=useState(500),[wants,setWants]=useState(400);
  const [first,setFirst]=useState<number|null>(null);
  const [years,setYears]=useState(10),[rate,setRate]=useState(6),[drawYears,setDrawYears]=useState(5);
  const remaining=budget-needs-wants;
  const comparing=first!==null;
  const investment=first??remaining,available=budget-needs,spending=budget-needs-investment;
  const target=remaining+Math.min(100,wants);
  const base=project(remaining,years,rate,drawYears);
  const alternative=comparing?project(investment,years,rate,drawYears):null;
  const active=alternative??base,difference=active.peak-base.peak;
  const settings=[
    {name:"Deposit years",value:years,set:setYears,options:[5,10,15,20,30]},
    {name:"Withdrawal years",value:drawYears,set:setDrawYears,options:[3,5,10,15]},
    {name:"Annual return (%)",value:rate,set:setRate,options:[0,3,6,9,12]}
  ];
  return <section className="pay-challenge" aria-label="Payday slider challenge">
    <header className="pay-title"><div><p>Payday challenge</p><h1 id="welcomeTitle" tabIndex={-1}>How far can {money(budget)} go?</h1></div><span>Round {comparing?2:1} of 2</span></header>
    <div className="pay-grid"><div className="pay-controls">
      <h2>{comparing?"Invest first":"Spend first"}</h2>
      <p>{comparing?(wants?`Keep needs at ${money(needs)}. Can you invest ${money(target)} each month by trimming wants?`:"Your first split already invests everything left after needs. Try moving some back to wants."):`You have ${money(budget)} each month. Set your needs and wants. Whatever is left goes into investment.`}</p>
      {comparing?<><Slider label="Investment" value={investment} max={available} onChange={setFirst} money={money}/>
        <div className="pay-fixed"><span>Needs <b>{money(needs)}</b></span><span>Wants <b>{money(spending)}</b></span></div></>:
        <><Slider label="Needs" value={needs} max={budget} money={money} onChange={n=>{setNeeds(n);setWants(Math.min(wants,budget-n));}}/>
        <Slider label="Wants" value={wants} max={available} money={money} onChange={setWants}/></>}
      <div className="pay-allocation" aria-hidden="true">{[[needs,colors.Needs],[spending,colors.Wants],[investment,colors.Investment]].map(([n,color])=><i key={color} style={{width:Number(n)/10+"%",background:String(color)}}/>)}</div>
      <div className="pay-total"><span>{comparing?"Monthly investment":"Left to invest"}</span><strong>{money(investment)}</strong></div>
      {comparing?<div className="pay-buttons"><button onClick={()=>setFirst(null)}>Edit my first split</button><span role="status">{wants>0&&investment>=target?"Monthly target reached":""}</span></div>:<button className="pay-next" onClick={()=>setFirst(remaining)}>Try investing first</button>}
    </div><div className="pay-outlook"><h2>Your money over time</h2>
      <div className="pay-stat"><div><span>After {years} years of SIP</span><strong>{money(active.peak)}</strong></div><div><span>Monthly SWP for {drawYears} years</span><strong>{money(active.payout)}</strong></div></div>
      <Trend original={base} alternative={alternative} years={years} drawYears={drawYears} money={money}/>
      {comparing&&<p className="pay-difference">{difference===0?"Both plans invest the same amount and reach the same balance.":`${money(Math.abs(investment-remaining))} ${difference>0?"more":"less"} invested each month gives you ${money(Math.abs(difference))} ${difference>0?"more":"less"} at year ${years} in this example.`}</p>}
      <details><summary>Assumptions · {rate}% annual return</summary><div className="pay-settings">{settings.map(({name,value,set,options})=><label key={name}>{name}<select value={value} onChange={e=>set(Number(e.target.value))}>{options.map(n=><option key={n}>{n}</option>)}</select></label>)}</div>
      <p>Monthly deposits (SIP) stop before monthly withdrawals (SWP) begin. Both use month-end payments and the same illustrative return, compounded monthly. Withdrawals use up the balance. Taxes, fees and inflation are excluded.</p></details>
    </div></div></section>;
}
