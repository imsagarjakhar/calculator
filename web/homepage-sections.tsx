import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {InvestmentHero} from "../src/components/InvestmentHero";
import {JourneyHeader} from "../src/components/JourneyHeader";
import {VlogProvider,VlogAccountButton} from "../src/components/Vlogs";
import {ToolScene} from "../src/components/ToolScene";
import "../src/styles/growth.css";
import "../bkp/planner.css";
import "../bkp/planner-header.css";
import "../src/styles/design-system.css";
import "../src/styles/money-studio.css";
import "./homepage-sections.css";

const concepts=["Topic grid","Retirement spotlight","Planner index","Money journal","Three starting points"];
const groups=[
 {name:"Investment",art:"growth",text:"See how monthly contributions build over time and follow the markets you invest in.",links:[["SIP growth planner","growth/"],["Global markets","markets/"]]},
 {name:"Retirement",art:"freedom",text:"Set an income goal, then plan which savings to draw from and when.",links:[["Custom Retirement Plan","freedom/"],["Bucket Strategy","bucket-plan/"],["Withdrawal planner","survival/"]]},
 {name:"Learning & Blog",art:"vlog",text:"Understand a finance term, work through an example or read a fresh perspective.",links:[["Learn finance","learn/"],["Worked examples","guides/"],["Blog","./#vlogs"]]},
 {name:"Calculators & Currency Converter",art:"currency",text:"Find a calculator for a specific question or convert an amount between currencies.",links:[["All calculators","all-calculators/"],["Currency converter","currency-converter/"]]},
 {name:"Loan Repayment",art:"loan",text:"Compare repayment schedules and see what an extra payment could save.",links:[["Loan payoff planner","loan-payoff/"],["Home loan EMI","all-calculators/#home-loan-emi"]]},
 {name:"Salary Planning",art:"salary",text:"Split take-home pay between bills, spending and savings before your next payday.",links:[["Salary Plan","salary-budget/"],["Monthly plan","custom-plan/"]]}
];
const shortcuts=[["Custom Retirement Plan","freedom/","freedom"],["Bucket Strategy","bucket-plan/","retirement"],["Salary Plan","salary-budget/","salary"]];
function App(){
 const valid=(x:number)=>Number.isInteger(x)&&x>=1&&x<=5?x:1;
 const [n,setN]=useState(()=>valid(Number(new URLSearchParams(location.search).get("design"))));
 const [topic,setTopic]=useState(0);
 function pick(v:number){setN(v);history.replaceState(null,"","?design="+v+"#explore-preview");requestAnimationFrame(()=>document.getElementById("explore-preview")?.scrollIntoView({behavior:"instant"}))}
 return <VlogProvider><main><section className="welcome" id="homeScreen"><JourneyHeader home showCurrency account={<VlogAccountButton/>}/><InvestmentHero/>
 <section id="explore-preview" className={"catalog-preview design-"+n}>
 <div className="concept-bar"><label>Preview layout<select value={n} onChange={e=>pick(Number(e.target.value))}>{concepts.map((c,i)=><option key={c} value={i+1}>{i+1}. {c}</option>)}</select></label></div>
 <h2 className="catalog-title">Explore money</h2>
 {n===5&&<div className="start-cards">{shortcuts.map(([title,url,kind])=><a href={url} key={url}><ToolScene kind={kind}/><strong>{title}</strong></a>)}</div>}
 <div className="catalog-body">{n===3&&<div className="topic-index" role="group" aria-label="Explore topics">{groups.map((g,i)=><button key={g.name} aria-pressed={topic===i} onClick={()=>setTopic(i)}>{g.name}</button>)}</div>}
 <div className="sections-grid">{groups.map((g,i)=><section key={g.name} className={"section-card segment-"+i} hidden={n===3&&topic!==i}>
 <div className="section-art"><ToolScene kind={g.art}/></div><div className="section-copy"><h3>{g.name}</h3><p>{g.text}</p><div className="section-links">{g.links.map(([name,url])=><a key={name} href={url}>{name}</a>)}</div></div></section>)}</div></div></section>
 </section></main></VlogProvider>
}
createRoot(document.getElementById("root")!).render(<App/>);

