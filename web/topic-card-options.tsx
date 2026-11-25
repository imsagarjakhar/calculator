import React from "react";
import {createRoot} from "react-dom/client";
import {ToolScene} from "../src/components/ToolScene";
import "./topic-card-options.css";

const paths=[["Custom Retirement Plan","freedom/"],["Bucket Strategy","bucket-plan/"],["Withdrawal planner","survival/"]];
const intro="Set an income goal, then plan which savings to draw from and when.";
function Arrow(){return <span className="arrow" aria-hidden="true">→</span>}
function Links({start=0}:{start?:number}){return <div className="rows">{paths.slice(start).map(([name,url])=><a href={url} key={url}>{name}<Arrow/></a>)}</div>}
function Art(){return <div className="art"><ToolScene kind="freedom"/></div>}
function Copy(){return <><h2>Retirement</h2><p>{intro}</p></>}
function App(){return <main>{["Destination rows","Primary action","Clickable feature","Expandable menu"].map((name,i)=><section key={name}><h1><small>0{i+1}</small> {name}</h1><article className={"card c"+i}>
 {i===0&&<><Art/><div className="copy"><Copy/></div><Links/></>}
 {i===1&&<><div className="top"><Art/><h2>Retirement</h2></div><p>{intro}</p><a className="primary" href={paths[0][1]}>Build my retirement plan <Arrow/></a><Links start={1}/></>}
 {i===2&&<><a className="feature" href={paths[0][1]}><Art/><h2>Custom Retirement Plan</h2><p>Explore the monthly income your savings could support.</p><b>Open planner <Arrow/></b></a><Links start={1}/></>}
 {i===3&&<><div className="top"><Art/><h2>Retirement</h2></div><p>{intro}</p><details><summary><span className="closed">Choose a planner</span><span className="opened">Hide planners</span><span className="count">3</span><span className="caret" aria-hidden="true">⌄</span></summary><Links/></details></>}
 </article></section>)}</main>}
createRoot(document.getElementById("root")!).render(<App/>);
