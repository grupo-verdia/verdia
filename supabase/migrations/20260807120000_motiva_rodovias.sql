-- Cadastro operacional das rodovias informado para o protótipo Verdia x Motiva.
-- Os limites de vegetação continuam como parâmetros de DEMONSTRAÇÃO.
insert into public.rodovias (id, codigo, nome, concessionaria, extensao_km, ativo) values
('sp-330','SP-330','Rodovia Anhanguera','Motiva | AutoBAn',147.04,true),
('sp-348','SP-348','Rodovia dos Bandeirantes','Motiva | AutoBAn',159.672,true),
('sp-300','SP-300','Rodovia Dom Gabriel Paulino Bueno Couto','Motiva | AutoBAn',2.6,true),
('spi-102-330','SPI-102/330','Rodovia Adalberto Panzan','Motiva | AutoBAn',7.54,true),
('sp-280','SP-280','Rodovia Castello Branco','Motiva | SPVias',null,true),
('sp-127','SP-127','Rodovia Antônio Romano Schincariol / Francisco da Silva Pontes','Motiva | SPVias',null,true),
('sp-255','SP-255','Rodovia João Mellão','Motiva | SPVias',null,true),
('sp-258','SP-258','Rodovia Francisco Alves Negrão','Motiva | SPVias',null,true),
('sp-270','SP-270','Rodovia Raposo Tavares','Motiva | SPVias',null,true),
('sp-021','SP-021','Rodoanel Mário Covas — Trecho Oeste','Motiva | Rodoanel',null,true),
('br-116','BR-116','Rodovia Presidente Dutra','Motiva | RioSP',null,true),
('br-101','BR-101','Rodovia Rio-Santos','Motiva | RioSP',null,true)
on conflict (id) do update set
  codigo = excluded.codigo,
  nome = excluded.nome,
  concessionaria = excluded.concessionaria,
  extensao_km = excluded.extensao_km,
  ativo = excluded.ativo;
