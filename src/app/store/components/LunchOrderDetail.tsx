//src\app\store\components\LunchOrderDetail.tsx
"use client";

import React, { useState } from "react";
import { ApiOrder } from "../lib/storeTypes";
import { formatCOP } from "../lib/storeUtils";

type StoreFetchFn = <T>(path: string, init?: RequestInit, retry?: boolean) => Promise<T>;

const LABELS: Record<string,string> = {
  PENDING_PAYMENT_REVIEW: "Pago por verificar",
  CONFIRMED: "Pago verificado / Confirmado",
  PREPARING: "En preparación",
  READY: "Listo",
  COMPLETED: "Completado",
  REJECTED: "Rechazado",
};

export default function LunchOrderDetail({ order, storeFetch, onRefresh }:{ order: ApiOrder; storeFetch?: StoreFetchFn; onRefresh:()=>void|Promise<void> }) {
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const status=String(order.lunchStatus??"PENDING_PAYMENT_REVIEW").toUpperCase();
  const items=Array.isArray(order.items)?order.items:[];
  const total=items.reduce((s,x)=>s+Number(x.qty||0)*Number(x.priceCOP||0),0);
  const customerName=String(order.customer?.name??"Cliente").trim()||"Cliente";
  const customerPhone=String(order.customer?.phone??"").trim();
  const phoneDigits=customerPhone.replace(/\D/g,"");
  const whatsappDigits=phoneDigits.startsWith("57")?phoneDigits:(phoneDigits.length===10?`57${phoneDigits}`:phoneDigits);

  async function change(next:string){
    if(!storeFetch||busy)return;
    setBusy(true);setErr("");
    try{
      await storeFetch(`/lunch/store/orders/${order.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
      await onRefresh();
    }catch(e:any){setErr(String(e?.message??"No se pudo actualizar el pedido"));}
    finally{setBusy(false);}
  }

  return <div className="flex min-h-full flex-col rounded-[18px] bg-white p-4">
    <div className="rounded-[18px] bg-gradient-to-br from-violet-950 to-violet-700 p-4 text-white">
      <div className="text-[11px] font-black uppercase tracking-[.18em] text-violet-200">🍽️ Pide un Almuerzo</div>
      <div className="mt-1 text-[22px] font-black">Pedido ...{order.id.slice(-6)}</div>
      <div className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-extrabold">{LABELS[status]??status}</div>
    </div>

    <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
      <Info label="Cliente" value={customerName}/>
      <Info label="Teléfono del cliente" value={customerPhone||"—"}/>
      <Info label="Modalidad" value={String(order.fulfillment).toUpperCase()==="PICKUP"?"Paso a recoger":"A domicilio"}/>
      <Info label="Referencia de pago" value={order.paymentReference||"—"}/>
      <Info label="Dirección" value={order.dropoffAddress||"—"}/>
      <Info label="Referencia" value={order.deliveryReference||"—"}/>
      <Info label="Método de pago" value={order.lunchPaymentMethod||"—"}/>
      <Info label="Nota" value={order.customerNote||"Sin nota"}/>
    </div>

    {customerPhone?<div className="mt-3 flex gap-2"><a href={`tel:${customerPhone}`} className="flex-1 rounded-[14px] bg-slate-900 px-4 py-3 text-center text-[13px] font-black text-white">📞 Llamar cliente</a><a href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hola ${customerName}, te contactamos de ${order.pickups?.[0]?.store?.name||"el restaurante"} por tu pedido de almuerzo KroniX.`)}`} target="_blank" rel="noreferrer" className="flex-1 rounded-[14px] bg-emerald-600 px-4 py-3 text-center text-[13px] font-black text-white">WhatsApp</a></div>:null}

    <div className="mt-3 rounded-[16px] border border-slate-200 p-3">
      <div className="mb-2 text-[14px] font-black text-slate-900">Detalle del pedido</div>
      <div className="space-y-2">
        {items.map((x,i)=><div key={`${x.productId??i}-${i}`} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
          <div><div className="font-extrabold text-slate-900">{x.qty} × {x.name}</div>{x.description?<div className="text-[11px] text-slate-500">{x.description}</div>:null}</div>
          <div className="font-black">{formatCOP(Number(x.qty||0)*Number(x.priceCOP||0))}</div>
        </div>)}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-3 text-[17px] font-black"><span>TOTAL</span><span>{formatCOP(total)}</span></div>
    </div>

    {err?<div className="mt-3 rounded-xl bg-red-50 p-3 text-[12px] font-bold text-red-700">{err}</div>:null}

    <div className="mt-auto flex flex-wrap gap-2 pt-4">
      {status==="PENDING_PAYMENT_REVIEW"?<><Action disabled={busy} onClick={()=>change("CONFIRMED")} cls="bg-emerald-600">✅ Verificar pago y confirmar</Action><Action disabled={busy} onClick={()=>change("REJECTED")} cls="bg-red-600">❌ Rechazar</Action></>:null}
      {status==="CONFIRMED"?<Action disabled={busy} onClick={()=>change("PREPARING")} cls="bg-blue-600">👨‍🍳 Iniciar preparación</Action>:null}
      {status==="PREPARING"?<Action disabled={busy} onClick={()=>change("READY")} cls="bg-amber-500">✅ Marcar listo</Action>:null}
      {status==="READY"&&String(order.fulfillment).toUpperCase()==="PICKUP"?<Action disabled={busy} onClick={()=>change("COMPLETED")} cls="bg-emerald-700">🏁 Entregado al cliente</Action>:null}
      {status==="READY"&&String(order.fulfillment).toUpperCase()==="DELIVERY"?<span className="self-center rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800">🛵 Listo · esperando domiciliario</span>:null}
      {busy?<span className="self-center text-[12px] font-bold text-slate-500">Actualizando…</span>:null}
    </div>
  </div>;
}
function Info({label,value}:{label:string;value:React.ReactNode}){return <div className="rounded-[14px] bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 font-bold text-slate-800">{value}</div></div>}
function Action({children,onClick,disabled,cls}:{children:React.ReactNode;onClick:()=>void;disabled:boolean;cls:string}){return <button type="button" disabled={disabled} onClick={onClick} className={`h-11 rounded-[14px] px-4 text-[13px] font-black text-white disabled:opacity-50 ${cls}`}>{children}</button>}
