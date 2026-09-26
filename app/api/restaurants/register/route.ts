import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ message: "Usa el acceso de Supabase Auth desde la pantalla de cuentas." }, { status: 410 })
}
