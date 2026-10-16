"use client";
import React, {useEffect, useRef, useState} from "react";
type StoreFetchFn = <T>(path:string, init?:RequestInit, retry?:boolean)=>Promise<T>;
export default function CommercePaymentReceipt({orderId,storeFetch}:{orderId:string;storeFetch?:StoreFetchFn}) {
  const [image,setImage]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false}},[]);
  async function open(){
    if(!storeFetch||busy)return;
    setBusy(true);setError("");
    try{
      const proof=await storeFetch<{mimeType:string;base64:string}>(`/commerce/store/orders/${encodeURIComponent(orderId)}/receipt`);
      if(!["image/png","image/jpeg","image/webp"].includes(proof.mimeType)||!proof.base64)throw new Error("Comprobante inválido.");
      if(active.current)setImage(`data:${proof.mimeType};base64,${proof.base64}`);
    }catch(e:any){if(active.current)setError(e.message||"No pudimos abrir el comprobante.");}
    finally{if(active.current)setBusy(false);}
  }
  return <section className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-3">
    <b className="text-sm">Comprobante adjunto por el cliente</b>
    <p className="mt-1 text-xs text-slate-600">Revisa la captura y confirma el abono en tu cuenta antes de verificar el pago.</p>
    {image?<><img src={image} alt="Captura del comprobante de pago" className="mt-2 max-h-96 w-full rounded-xl object-contain"/><button type="button" onClick={()=>setImage("")} className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold">Ocultar comprobante</button></>:<button disabled={!storeFetch||busy} type="button" onClick={()=>void open()} className="mt-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?"Abriendo…":"Ver comprobante de pago"}</button>}
    {error?<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>:null}
  </section>;
}
