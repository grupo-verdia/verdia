/** Motiva roadside catalog used by Planejamento / Excel import (code-seeded). */
export type Rodovia = {
  id: string;
  codigo: string;
  nome: string;
  concessionaria: string;
  extensaoKm: number | null;
};

export const MOTIVA_RODOVIAS: readonly Rodovia[] = [
  {
    id: "sp-330",
    codigo: "SP-330",
    nome: "Rodovia Anhanguera",
    concessionaria: "Motiva | AutoBAn",
    extensaoKm: 147.04,
  },
  {
    id: "sp-348",
    codigo: "SP-348",
    nome: "Rodovia dos Bandeirantes",
    concessionaria: "Motiva | AutoBAn",
    extensaoKm: 159.67,
  },
  {
    id: "sp-300",
    codigo: "SP-300",
    nome: "Rodovia Dom Gabriel Paulino Bueno Couto",
    concessionaria: "Motiva | AutoBAn",
    extensaoKm: 2.6,
  },
  {
    id: "spi-102-330",
    codigo: "SPI-102/330",
    nome: "Rodovia Adalberto Panzan",
    concessionaria: "Motiva | AutoBAn",
    extensaoKm: 7.54,
  },
  {
    id: "sp-280",
    codigo: "SP-280",
    nome: "Rodovia Castello Branco",
    concessionaria: "Motiva | SPVias",
    extensaoKm: null,
  },
  {
    id: "sp-127",
    codigo: "SP-127",
    nome: "Rodovia Antônio Romano Schincariol / Francisco da Silva Pontes",
    concessionaria: "Motiva | SPVias",
    extensaoKm: null,
  },
  {
    id: "sp-255",
    codigo: "SP-255",
    nome: "Rodovia João Mellão",
    concessionaria: "Motiva | SPVias",
    extensaoKm: null,
  },
  {
    id: "sp-258",
    codigo: "SP-258",
    nome: "Rodovia Francisco Alves Negrão",
    concessionaria: "Motiva | SPVias",
    extensaoKm: null,
  },
  {
    id: "sp-270",
    codigo: "SP-270",
    nome: "Rodovia Raposo Tavares",
    concessionaria: "Motiva | SPVias",
    extensaoKm: null,
  },
  {
    id: "sp-021",
    codigo: "SP-021",
    nome: "Rodoanel Mário Covas — Trecho Oeste",
    concessionaria: "Motiva | Rodoanel",
    extensaoKm: null,
  },
  {
    id: "br-116",
    codigo: "BR-116",
    nome: "Rodovia Presidente Dutra",
    concessionaria: "Motiva | RioSP",
    extensaoKm: null,
  },
  {
    id: "br-101",
    codigo: "BR-101",
    nome: "Rodovia Rio-Santos",
    concessionaria: "Motiva | RioSP",
    extensaoKm: null,
  },
] as const;

export function listMotivaRodovias(): Rodovia[] {
  return [...MOTIVA_RODOVIAS];
}

export function getRodoviaById(id: string): Rodovia | null {
  return MOTIVA_RODOVIAS.find((rodovia) => rodovia.id === id) ?? null;
}
