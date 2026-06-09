// Dados da Copa 2026

export const GRUPOS = {
  A: { times: ["Mexico", "Africa do Sul", "Coreia do Sul", "Rep. Tcheca"] },
  B: { times: ["Canada", "Bosnia", "Catar", "Suica"] },
  C: { times: ["Brasil", "Marrocos", "Haiti", "Escocia"] },
  D: { times: ["EUA", "Paraguai", "Australia", "Turquia"] },
  E: { times: ["Alemanha", "Curacao", "Costa do Marfim", "Equador"] },
  F: { times: ["Holanda", "Japao", "Suecia", "Tunisia"] },
  G: { times: ["Belgica", "Egito", "Ira", "Nova Zelandia"] },
  H: { times: ["Espanha", "Cabo Verde", "Arabia Saudita", "Uruguai"] },
  I: { times: ["Franca", "Senegal", "Iraque", "Noruega"] },
  J: { times: ["Argentina", "Algeria", "Austria", "Jordania"] },
  K: { times: ["Portugal", "Congo DR", "Uzbequistao", "Colombia"] },
  L: { times: ["Inglaterra", "Croacia", "Gana", "Panama"] },
};

export const CODIGOS_PAIS = {
  "Mexico": "mx", "Africa do Sul": "za", "Coreia do Sul": "kr", "Rep. Tcheca": "cz",
  "Canada": "ca", "Bosnia": "ba", "Catar": "qa", "Suica": "ch",
  "Brasil": "br", "Marrocos": "ma", "Haiti": "ht", "Escocia": "gb-sct",
  "EUA": "us", "Paraguai": "py", "Australia": "au", "Turquia": "tr",
  "Alemanha": "de", "Curacao": "cw", "Costa do Marfim": "ci", "Equador": "ec",
  "Holanda": "nl", "Japao": "jp", "Suecia": "se", "Tunisia": "tn",
  "Belgica": "be", "Egito": "eg", "Ira": "ir", "Nova Zelandia": "nz",
  "Espanha": "es", "Cabo Verde": "cv", "Arabia Saudita": "sa", "Uruguai": "uy",
  "Franca": "fr", "Senegal": "sn", "Iraque": "iq", "Noruega": "no",
  "Argentina": "ar", "Algeria": "dz", "Austria": "at", "Jordania": "jo",
  "Portugal": "pt", "Congo DR": "cd", "Uzbequistao": "uz", "Colombia": "co",
  "Inglaterra": "gb-eng", "Croacia": "hr", "Gana": "gh", "Panama": "pa",
};

// Todos os 48 jogos da fase de grupos (horarios em BRT = UTC-3)
export const JOGOS_GRUPOS = [
  // Rodada 1
  { id: "A1", grupo: "A", rodada: 1, time1: "Mexico",        time2: "Africa do Sul",  data: "2026-06-11T20:00:00-03:00", local: "Cidade do Mexico" },
  { id: "A2", grupo: "A", rodada: 1, time1: "Coreia do Sul", time2: "Rep. Tcheca",     data: "2026-06-12T01:00:00-03:00", local: "Guadalajara" },
  { id: "B1", grupo: "B", rodada: 1, time1: "Canada",        time2: "Bosnia",          data: "2026-06-12T16:00:00-03:00", local: "Toronto" },
  { id: "D1", grupo: "D", rodada: 1, time1: "EUA",           time2: "Paraguai",        data: "2026-06-12T22:00:00-03:00", local: "Los Angeles" },
  { id: "C1", grupo: "C", rodada: 1, time1: "Brasil",        time2: "Marrocos",        data: "2026-06-13T16:00:00-03:00", local: "Nova York/NJ" },
  { id: "D2", grupo: "D", rodada: 1, time1: "Australia",     time2: "Turquia",         data: "2026-06-13T19:00:00-03:00", local: "Vancouver" },
  { id: "C2", grupo: "C", rodada: 1, time1: "Haiti",         time2: "Escocia",         data: "2026-06-13T22:00:00-03:00", local: "Boston" },
  { id: "B2", grupo: "B", rodada: 1, time1: "Catar",         time2: "Suica",           data: "2026-06-14T01:00:00-03:00", local: "San Francisco" },
  { id: "E1", grupo: "E", rodada: 1, time1: "Alemanha",      time2: "Curacao",         data: "2026-06-14T16:00:00-03:00", local: "Dallas" },
  { id: "F1", grupo: "F", rodada: 1, time1: "Holanda",       time2: "Japao",           data: "2026-06-14T19:00:00-03:00", local: "Dallas" },
  { id: "E2", grupo: "E", rodada: 1, time1: "Costa do Marfim", time2: "Equador",       data: "2026-06-14T22:00:00-03:00", local: "Houston" },
  { id: "F2", grupo: "F", rodada: 1, time1: "Suecia",        time2: "Tunisia",         data: "2026-06-15T01:00:00-03:00", local: "Guadalajara" },
  { id: "G1", grupo: "G", rodada: 1, time1: "Belgica",       time2: "Egito",           data: "2026-06-15T16:00:00-03:00", local: "Atlanta" },
  { id: "H1", grupo: "H", rodada: 1, time1: "Espanha",       time2: "Cabo Verde",      data: "2026-06-15T19:00:00-03:00", local: "Miami" },
  { id: "G2", grupo: "G", rodada: 1, time1: "Ira",           time2: "Nova Zelandia",   data: "2026-06-15T22:00:00-03:00", local: "Seattle" },
  { id: "H2", grupo: "H", rodada: 1, time1: "Arabia Saudita", time2: "Uruguai",        data: "2026-06-16T01:00:00-03:00", local: "Kansas City" },
  { id: "I1", grupo: "I", rodada: 1, time1: "Franca",        time2: "Senegal",         data: "2026-06-16T16:00:00-03:00", local: "Nova York/NJ" },
  { id: "J1", grupo: "J", rodada: 1, time1: "Argentina",     time2: "Algeria",         data: "2026-06-16T19:00:00-03:00", local: "Dallas" },
  { id: "I2", grupo: "I", rodada: 1, time1: "Iraque",        time2: "Noruega",         data: "2026-06-16T22:00:00-03:00", local: "Philadelphia" },
  { id: "J2", grupo: "J", rodada: 1, time1: "Austria",       time2: "Jordania",        data: "2026-06-17T01:00:00-03:00", local: "Houston" },
  { id: "K1", grupo: "K", rodada: 1, time1: "Portugal",      time2: "Congo DR",        data: "2026-06-17T16:00:00-03:00", local: "Kansas City" },
  { id: "L1", grupo: "L", rodada: 1, time1: "Inglaterra",    time2: "Croacia",         data: "2026-06-17T19:00:00-03:00", local: "Miami" },
  { id: "K2", grupo: "K", rodada: 1, time1: "Uzbequistao",   time2: "Colombia",        data: "2026-06-17T22:00:00-03:00", local: "Seattle" },
  { id: "L2", grupo: "L", rodada: 1, time1: "Gana",          time2: "Panama",          data: "2026-06-18T01:00:00-03:00", local: "Atlanta" },
  // Rodada 2
  { id: "A3", grupo: "A", rodada: 2, time1: "Mexico",        time2: "Coreia do Sul",   data: "2026-06-18T16:00:00-03:00", local: "Monterrey" },
  { id: "A4", grupo: "A", rodada: 2, time1: "Africa do Sul", time2: "Rep. Tcheca",     data: "2026-06-18T22:00:00-03:00", local: "Cidade do Mexico" },
  { id: "B3", grupo: "B", rodada: 2, time1: "Canada",        time2: "Catar",           data: "2026-06-19T16:00:00-03:00", local: "Vancouver" },
  { id: "B4", grupo: "B", rodada: 2, time1: "Bosnia",        time2: "Suica",           data: "2026-06-19T22:00:00-03:00", local: "San Francisco" },
  { id: "C3", grupo: "C", rodada: 2, time1: "Brasil",        time2: "Haiti",           data: "2026-06-20T16:00:00-03:00", local: "Los Angeles" },
  { id: "C4", grupo: "C", rodada: 2, time1: "Marrocos",      time2: "Escocia",         data: "2026-06-20T22:00:00-03:00", local: "Philadelphia" },
  { id: "D3", grupo: "D", rodada: 2, time1: "EUA",           time2: "Australia",       data: "2026-06-21T16:00:00-03:00", local: "Kansas City" },
  { id: "D4", grupo: "D", rodada: 2, time1: "Paraguai",      time2: "Turquia",         data: "2026-06-21T22:00:00-03:00", local: "Boston" },
  { id: "E3", grupo: "E", rodada: 2, time1: "Alemanha",      time2: "Costa do Marfim", data: "2026-06-22T16:00:00-03:00", local: "Houston" },
  { id: "E4", grupo: "E", rodada: 2, time1: "Curacao",       time2: "Equador",         data: "2026-06-22T22:00:00-03:00", local: "Monterrey" },
  { id: "F3", grupo: "F", rodada: 2, time1: "Holanda",       time2: "Suecia",          data: "2026-06-23T16:00:00-03:00", local: "Dallas" },
  { id: "F4", grupo: "F", rodada: 2, time1: "Japao",         time2: "Tunisia",         data: "2026-06-23T22:00:00-03:00", local: "Guadalajara" },
  { id: "G3", grupo: "G", rodada: 2, time1: "Belgica",       time2: "Ira",             data: "2026-06-24T16:00:00-03:00", local: "Los Angeles" },
  { id: "G4", grupo: "G", rodada: 2, time1: "Egito",         time2: "Nova Zelandia",   data: "2026-06-24T22:00:00-03:00", local: "Seattle" },
  { id: "H3", grupo: "H", rodada: 2, time1: "Espanha",       time2: "Arabia Saudita",  data: "2026-06-25T16:00:00-03:00", local: "Miami" },
  { id: "H4", grupo: "H", rodada: 2, time1: "Cabo Verde",    time2: "Uruguai",         data: "2026-06-25T22:00:00-03:00", local: "Atlanta" },
  // Rodada 3
  { id: "I3", grupo: "I", rodada: 3, time1: "Franca",        time2: "Iraque",          data: "2026-06-26T16:00:00-03:00", local: "Nova York/NJ" },
  { id: "I4", grupo: "I", rodada: 3, time1: "Senegal",       time2: "Noruega",         data: "2026-06-26T16:00:00-03:00", local: "Philadelphia" },
  { id: "J3", grupo: "J", rodada: 3, time1: "Argentina",     time2: "Austria",         data: "2026-06-26T22:00:00-03:00", local: "Dallas" },
  { id: "J4", grupo: "J", rodada: 3, time1: "Algeria",       time2: "Jordania",        data: "2026-06-26T22:00:00-03:00", local: "Houston" },
  { id: "K3", grupo: "K", rodada: 3, time1: "Portugal",      time2: "Uzbequistao",     data: "2026-06-27T16:00:00-03:00", local: "Kansas City" },
  { id: "K4", grupo: "K", rodada: 3, time1: "Congo DR",      time2: "Colombia",        data: "2026-06-27T16:00:00-03:00", local: "Seattle" },
  { id: "L3", grupo: "L", rodada: 3, time1: "Inglaterra",    time2: "Gana",            data: "2026-06-27T22:00:00-03:00", local: "Miami" },
  { id: "L4", grupo: "L", rodada: 3, time1: "Croacia",       time2: "Panama",          data: "2026-06-27T22:00:00-03:00", local: "Atlanta" },
];

export const PONTUACAO = {
  grupos:  { acertou_empate: 2, acertou_vencedor: 1, acertou_placar: 3, errou: 0 },
  oitavas: { acertou_vencedor: 4,  acertou_placar: 6  },
  quartas: { acertou_vencedor: 8,  acertou_placar: 10 },
  semi:    { acertou_vencedor: 15, acertou_placar: 20 },
  final:   { acertou_vencedor: 30, acertou_placar: 50 },
};

export const CUSTO_PALPITE = {
  grupos: 0.50, oitavas: 2.00, quartas: 5.00, semi: 10.00, final: 20.00,
};

export const DISTRIBUICAO_PREMIO = {
  campeao_geral: 0.50, melhor_grupos: 0.30, melhor_oitavas: 0.03,
  melhor_quartas: 0.07, melhor_semi: 0.10,
};

export const CHAVEAMENTO_R32 = [
  { id: "R32_1",  fase: "oitavas", slot1: "1A", slot2: "2B" },
  { id: "R32_2",  fase: "oitavas", slot1: "1C", slot2: "2D" },
  { id: "R32_3",  fase: "oitavas", slot1: "1E", slot2: "2F" },
  { id: "R32_4",  fase: "oitavas", slot1: "1G", slot2: "2H" },
  { id: "R32_5",  fase: "oitavas", slot1: "1I", slot2: "2J" },
  { id: "R32_6",  fase: "oitavas", slot1: "1K", slot2: "2L" },
  { id: "R32_7",  fase: "oitavas", slot1: "1B", slot2: "2A" },
  { id: "R32_8",  fase: "oitavas", slot1: "1D", slot2: "2C" },
  { id: "R32_9",  fase: "oitavas", slot1: "1F", slot2: "2E" },
  { id: "R32_10", fase: "oitavas", slot1: "1H", slot2: "2G" },
  { id: "R32_11", fase: "oitavas", slot1: "1J", slot2: "2I" },
  { id: "R32_12", fase: "oitavas", slot1: "1L", slot2: "2K" },
  { id: "R32_13", fase: "oitavas", slot1: "3ABC", slot2: "3DEF" },
  { id: "R32_14", fase: "oitavas", slot1: "3GHI", slot2: "3JKL" },
  { id: "R32_15", fase: "oitavas", slot1: "3ABD", slot2: "3CEF" },
  { id: "R32_16", fase: "oitavas", slot1: "3GHJ", slot2: "3IKL" },
];
