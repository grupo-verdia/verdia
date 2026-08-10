import { NextRequest, NextResponse } from "next/server";
import { getCaptura, overrideCaptura } from "@/lib/verdia-store";
import type { Classe } from "@/lib/verdia-domain";
const classes = new Set(["baixa","média","alta"]);
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){try{const c=await getCaptura((await params).id);return c?NextResponse.json(c):NextResponse.json({error:"not found"},{status:404})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"failed"},{status:500})}}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const body=await req.json();if(!classes.has(body.classeFinal)||typeof body.motivo!=="string"||body.motivo.trim().length<5)return NextResponse.json({error:"classeFinal e motivo são obrigatórios"},{status:400});const c=await overrideCaptura((await params).id,{classeFinal:body.classeFinal as Classe,alturaCm:typeof body.alturaCm==='number'?body.alturaCm:null,motivo:body.motivo.trim()});return NextResponse.json(c)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"failed"},{status:500})}}
