import { NextRequest, NextResponse } from "next/server";
import { listCapturas } from "@/lib/verdia-store";
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){try{return NextResponse.json({capturas:await listCapturas((await params).id)})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'failed'},{status:500})}}
