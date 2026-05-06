'use client';
export default function Error({ statusCode }: { statusCode?: number }) { return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#111',color:'#eee'}}><div style={{textAlign:'center'}}><h1 style={{fontSize:'6rem',color:'#444'}}>{statusCode || 500}</h1><p style={{fontSize:'1.2rem'}}>出现了一个错误</p></div></div>; }
