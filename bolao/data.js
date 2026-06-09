// ── DADOS DA COPA 2026 ──

// Todos os jogos da fase de grupos + estrutura do mata-mata



export const GRUPOS = {

  A: { times: ["México", "África do Sul", "Coreia do Sul", "Rep. Tcheca"] },

  B: { times: ["Canadá", "Bósnia", "Catar", "Suíça"] },

  C: { times: ["Brasil", "Marrocos", "Haiti", "Escócia"] },

  D: { times: ["EUA", "Paraguai", "Austrália", "Turquia"] },

  E: { times: ["Alemanha", "Curaçao", "Costa do Marfim", "Equador"] },

  F: { times: ["Holanda", "Japão", "Suécia", "Tunísia"] },

  G: { times: ["Bélgica", "Egito", "Irã", "Nova Zelândia"] },

  H: { times: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"] },

  I: { times: ["França", "Senegal", "Iraque", "Noruega"] },

  J: { times: ["Argentina", "Argélia", "Áustria", "Jordânia"] },

  K: { times: ["Portugal", "Congo DR", "Uzbequistão", "Colômbia"] },

  L: { times: ["Inglaterra", "Croácia", "Gana", "Panamá"] },

};



export const BANDEIRAS = {
  "México": "🇲🇽",
  "África do Sul": "🇿🇦",
  "Coreia do Sul": "🇰🇷",
  "Rep. Tcheca": "🇨🇿",
  "Canadá": "🇨🇦",
  "Bósnia": "🇧🇦",
  "Catar": "🇶🇦",
  "Suíça": "🇨🇭",
  "Brasil": "🇧🇷",
  "Marrocos": "🇲🇦",
  "Haiti": "🇭🇹",
  "Escócia": "🏴",
  "EUA": "🇺🇸",
  "Paraguai": "🇵🇾",
  "Austrália": "🇦🇺",
  "Turquia": "🇹🇷",
  "Alemanha": "🇩🇪",
  "Curaçao": "🇨🇼",
  "Costa do Marfim": "🇨🇮",
  "Equador": "🇪🇨",
  "Holanda": "🇳🇱",
  "Japão": "🇯🇵",
  "Suécia": "🇸🇪",
  "Tunísia": "🇹🇳",
  "Bélgica": "🇧🇪",
  "Egito": "🇪🇬",
  "Irã": "🇮🇷",
  "Nova Zelândia": "🇳🇿",
  "Espanha": "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Arábia Saudita": "🇸🇦",
  "Uruguai": "🇺🇾",
  "França": "🇫🇷",
  "Senegal": "🇸🇳",
  "Iraque": "🇮🇶",
  "Noruega": "🇳🇴",
  "Argentina": "🇦🇷",
  "Argélia": "🇩🇿",
  "Áustria": "🇦🇹",
  "Jordânia": "🇯🇴",
  "Portugal": "🇵🇹",
  "Congo DR": "🇨🇩",
  "Uzbequistão": "🇺🇿",
  "Colômbia": "🇨🇴",
  "Inglaterra": "🏴",
  "Croácia": "🇭🇷",
  "Gana": "🇬🇭",
  "Panamá": "🇵🇦",
};



// Todos os 48 jogos da fase de grupos

// Horários em UTC-3 (horário de Brasília)

export const JOGOS_GRUPOS = [

  // ── RODADA 1 ──

  // 11 de junho

  { id: "A1", grupo: "A", rodada: 1, time1: "México",        time2: "África do Sul",  data: "2026-06-11T20:00:00-03:00", local: "Cidade do México" },

  { id: "A2", grupo: "A", rodada: 1, time1: "Coreia do Sul", time2: "Rep. Tcheca",     data: "2026-06-12T01:00:00-03:00", local: "Guadalajara" },

  // 12 de junho

  { id: "B1", grupo: "B", rodada: 1, time1: "Canadá",        time2: "Bósnia",          data: "2026-06-12T16:00:00-03:00", local: "Toronto" },

  { id: "D1", grupo: "D", rodada: 1, time1: "EUA",           time2: "Paraguai",        data: "2026-06-12T22:00:00-03:00", local: "Los Angeles" },

  // 13 de junho

  { id: "C1", grupo: "C", rodada: 1, time1: "Brasil",        time2: "Marrocos",        data: "2026-06-13T16:00:00-03:00", local: "Nova York/NJ" },

  { id: "D2", grupo: "D", rodada: 1, time1: "Austrália",     time2: "Turquia",         data: "2026-06-13T19:00:00-03:00", local: "Vancouver" },

  { id: "C2", grupo: "C", rodada: 1, time1: "Haiti",         time2: "Escócia",         data: "2026-06-13T22:00:00-03:00", local: "Boston" },

  { id: "B2", grupo: "B", rodada: 1, time1: "Catar",         time2: "Suíça",           data: "2026-06-14T01:00:00-03:00", local: "San Francisco" },

  // 14 de junho

  { id: "E1", grupo: "E", rodada: 1, time1: "Alemanha",      time2: "Curaçao",         data: "2026-06-14T16:00:00-03:00", local: "Dallas" },

  { id: "F1", grupo: "F", rodada: 1, time1: "Holanda",       time2: "Japão",           data: "2026-06-14T19:00:00-03:00", local: "Dallas" },

  { id: "E2", grupo: "E", rodada: 1, time1: "Costa do Marfim", time2: "Equador",       data: "2026-06-14T22:00:00-03:00", local: "Houston" },

  { id: "F2", grupo: "F", rodada: 1, time1: "Suécia",        time2: "Tunísia",         data: "2026-06-15T01:00:00-03:00", local: "Guadalajara" },

  // 15 de junho

  { id: "G1", grupo: "G", rodada: 1, time1: "Bélgica",       time2: "Egito",           data: "2026-06-15T16:00:00-03:00", local: "Atlanta" },

  { id: "H1", grupo: "H", rodada: 1, time1: "Espanha",       time2: "Cabo Verde",      data: "2026-06-15T19:00:00-03:00", local: "Miami" },

  { id: "G2", grupo: "G", rodada: 1, time1: "Irã",           time2: "Nova Zelândia",   data: "2026-06-15T22:00:00-03:00", local: "Seattle" },

  { id: "H2", grupo: "H", rodada: 1, time1: "Arábia Saudita", time2: "Uruguai",        data: "2026-06-16T01:00:00-03:00", local: "Kansas City" },

  // 16 de junho

  { id: "I1", grupo: "I", rodada: 1, time1: "França",        time2: "Senegal",         data: "2026-06-16T16:00:00-03:00", local: "Nova York/NJ" },

  { id: "J1", grupo: "J", rodada: 1, time1: "Argentina",     time2: "Argélia",         data: "2026-06-16T19:00:00-03:00", local: "Dallas" },

  { id: "I2", grupo: "I", rodada: 1, time1: "Iraque",        time2: "Noruega",         data: "2026-06-16T22:00:00-03:00", local: "Philadelphia" },

  { id: "J2", grupo: "J", rodada: 1, time1: "Áustria",       time2: "Jordânia",        data: "2026-06-17T01:00:00-03:00", local: "Houston" },

  // 17 de junho

  { id: "K1", grupo: "K", rodada: 1, time1: "Portugal",      time2: "Congo DR",        data: "2026-06-17T16:00:00-03:00", local: "Kansas City" },

  { id: "L1", grupo: "L", rodada: 1, time1: "Inglaterra",    time2: "Croácia",         data: "2026-06-17T19:00:00-03:00", local: "Miami" },

  { id: "K2", grupo: "K", rodada: 1, time1: "Uzbequistão",   time2: "Colômbia",        data: "2026-06-17T22:00:00-03:00", local: "Seattle" },

  { id: "L2", grupo: "L", rodada: 1, time1: "Gana",          time2: "Panamá",          data: "2026-06-18T01:00:00-03:00", local: "Atlanta" },



  // ── RODADA 2 ──

  // 18 de junho

  { id: "A3", grupo: "A", rodada: 2, time1: "México",        time2: "Coreia do Sul",   data: "2026-06-18T16:00:00-03:00", local: "Monterrey" },

  { id: "A4", grupo: "A", rodada: 2, time1: "África do Sul", time2: "Rep. Tcheca",     data: "2026-06-18T22:00:00-03:00", local: "Cidade do México" },

  // 19 de junho

  { id: "B3", grupo: "B", rodada: 2, time1: "Canadá",        time2: "Catar",           data: "2026-06-19T16:00:00-03:00", local: "Vancouver" },

  { id: "B4", grupo: "B", rodada: 2, time1: "Bósnia",        time2: "Suíça",           data: "2026-06-19T22:00:00-03:00", local: "San Francisco" },

  // 20 de junho

  { id: "C3", grupo: "C", rodada: 2, time1: "Brasil",        time2: "Haiti",           data: "2026-06-20T16:00:00-03:00", local: "Los Angeles" },

  { id: "C4", grupo: "C", rodada: 2, time1: "Marrocos",      time2: "Escócia",         data: "2026-06-20T22:00:00-03:00", local: "Philadelphia" },

  // 21 de junho

  { id: "D3", grupo: "D", rodada: 2, time1: "EUA",           time2: "Austrália",       data: "2026-06-21T16:00:00-03:00", local: "Kansas City" },

  { id: "D4", grupo: "D", rodada: 2, time1: "Paraguai",      time2: "Turquia",         data: "2026-06-21T22:00:00-03:00", local: "Boston" },

  // 22 de junho

  { id: "E3", grupo: "E", rodada: 2, time1: "Alemanha",      time2: "Costa do Marfim", data: "2026-06-22T16:00:00-03:00", local: "Houston" },

  { id: "E4", grupo: "E", rodada: 2, time1: "Curaçao",       time2: "Equador",         data: "2026-06-22T22:00:00-03:00", local: "Monterrey" },

  // 23 de junho

  { id: "F3", grupo: "F", rodada: 2, time1: "Holanda",       time2: "Suécia",          data: "2026-06-23T16:00:00-03:00", local: "Dallas" },

  { id: "F4", grupo: "F", rodada: 2, time1: "Japão",         time2: "Tunísia",         data: "2026-06-23T22:00:00-03:00", local: "Guadalajara" },

  // 24 de junho

  { id: "G3", grupo: "G", rodada: 2, time1: "Bélgica",       time2: "Irã",             data: "2026-06-24T16:00:00-03:00", local: "Los Angeles" },

  { id: "G4", grupo: "G", rodada: 2, time1: "Egito",         time2: "Nova Zelândia",   data: "2026-06-24T22:00:00-03:00", local: "Seattle" },

  // 25 de junho

  { id: "H3", grupo: "H", rodada: 2, time1: "Espanha",       time2: "Arábia Saudita",  data: "2026-06-25T16:00:00-03:00", local: "Miami" },

  { id: "H4", grupo: "H", rodada: 2, time1: "Cabo Verde",    time2: "Uruguai",         data: "2026-06-25T22:00:00-03:00", local: "Atlanta" },



  // ── RODADA 3 (jogos simultâneos por grupo) ──

  // 26 de junho

  { id: "I3", grupo: "I", rodada: 2, time1: "França",        time2: "Iraque",          data: "2026-06-26T16:00:00-03:00", local: "Nova York/NJ" },

  { id: "I4", grupo: "I", rodada: 2, time1: "Senegal",       time2: "Noruega",         data: "2026-06-26T16:00:00-03:00", local: "Philadelphia" },

  { id: "J3", grupo: "J", rodada: 2, time1: "Argentina",     time2: "Áustria",         data: "2026-06-26T22:00:00-03:00", local: "Dallas" },

  { id: "J4", grupo: "J", rodada: 2, time1: "Argélia",       time2: "Jordânia",        data: "2026-06-26T22:00:00-03:00", local: "Houston" },

  // 27 de junho

  { id: "K3", grupo: "K", rodada: 2, time1: "Portugal",      time2: "Uzbequistão",     data: "2026-06-27T16:00:00-03:00", local: "Kansas City" },

  { id: "K4", grupo: "K", rodada: 2, time1: "Congo DR",      time2: "Colômbia",        data: "2026-06-27T16:00:00-03:00", local: "Seattle" },

  { id: "L3", grupo: "L", rodada: 3, time1: "Inglaterra",    time2: "Gana",            data: "2026-06-27T22:00:00-03:00", local: "Miami" },

  { id: "L4", grupo: "L", rodada: 3, time1: "Croácia",       time2: "Panamá",          data: "2026-06-27T22:00:00-03:00", local: "Atlanta" },

];



// Tabela de pontuação por fase

export const PONTUACAO = {

  grupos: {

    acertou_empate:   2,  // acertou que seria empate

    acertou_vencedor: 1,  // acertou o time vencedor

    acertou_placar:   3,  // acertou time vencedor E placar exato

    errou:            0,

  },

  oitavas: {

    acertou_vencedor: 4,

    acertou_placar:   6,

  },

  quartas: {

    acertou_vencedor: 8,

    acertou_placar:   10,

  },

  semi: {

    acertou_vencedor: 15,

    acertou_placar:   20,

  },

  final: {

    acertou_vencedor: 30,

    acertou_placar:   50,

  },

};



// Custo por palpite por fase

export const CUSTO_PALPITE = {

  grupos:  0.50,

  oitavas: 2.00,

  quartas: 5.00,

  semi:    10.00,

  final:   20.00,

};



// Distribuição do prêmio

export const DISTRIBUICAO_PREMIO = {

  campeao_geral:    0.50,  // 50% – melhor pontuação geral no final

  melhor_grupos:    0.30,  // 30% – melhor só na fase de grupos

  melhor_oitavas:   0.03,  //  3% – melhor só nas oitavas

  melhor_quartas:   0.07,  //  7% – melhor só nas quartas

  melhor_semi:      0.10,  // 10% – melhor só na semi

};



// Chaveamento do mata-mata (Round of 32)

// Baseado no formato oficial FIFA 2026

// Os 8 melhores terceiros colocados também avançam

// Confrontos fixos por posição de grupo

export const CHAVEAMENTO_R32 = [

  // Chave 1 (lado esquerdo superior)

  { id: "R32_1",  fase: "oitavas", slot1: "1A", slot2: "2B" },

  { id: "R32_2",  fase: "oitavas", slot1: "1C", slot2: "2D" },

  { id: "R32_3",  fase: "oitavas", slot1: "1E", slot2: "2F" },

  { id: "R32_4",  fase: "oitavas", slot1: "1G", slot2: "2H" },

  // Chave 2 (lado direito superior)

  { id: "R32_5",  fase: "oitavas", slot1: "1I", slot2: "2J" },

  { id: "R32_6",  fase: "oitavas", slot1: "1K", slot2: "2L" },

  { id: "R32_7",  fase: "oitavas", slot1: "1B", slot2: "2A" },

  { id: "R32_8",  fase: "oitavas", slot1: "1D", slot2: "2C" },

  // Chave 3 (lado esquerdo inferior)

  { id: "R32_9",  fase: "oitavas", slot1: "1F", slot2: "2E" },

  { id: "R32_10", fase: "oitavas", slot1: "1H", slot2: "2G" },

  { id: "R32_11", fase: "oitavas", slot1: "1J", slot2: "2I" },

  { id: "R32_12", fase: "oitavas", slot1: "1L", slot2: "2K" },

  // Terceiros colocados (8 melhores)

  { id: "R32_13", fase: "oitavas", slot1: "3ABC", slot2: "3DEF" },

  { id: "R32_14", fase: "oitavas", slot1: "3GHI", slot2: "3JKL" },

  { id: "R32_15", fase: "oitavas", slot1: "3ABD", slot2: "3CEF" },

  { id: "R32_16", fase: "oitavas", slot1: "3GHJ", slot2: "3IKL" },

];



export const CODIGOS_PAIS = {
  "México": "mx", "África do Sul": "za", "Coreia do Sul": "kr", "Rep. Tcheca": "cz",
  "Canadá": "ca", "Bósnia": "ba", "Catar": "qa", "Suíça": "ch",
  "Brasil": "br", "Marrocos": "ma", "Haiti": "ht", "Escócia": "gb-sct",
  "EUA": "us", "Paraguai": "py", "Austrália": "au", "Turquia": "tr",
  "Alemanha": "de", "Curaçao": "cw", "Costa do Marfim": "ci", "Equador": "ec",
  "Holanda": "nl", "Japão": "jp", "Suécia": "se", "Tunísia": "tn",
  "Bélgica": "be", "Egito": "eg", "Irã": "ir", "Nova Zelândia": "nz",
  "Espanha": "es", "Cabo Verde": "cv", "Arábia Saudita": "sa", "Uruguai": "uy",
  "França": "fr", "Senegal": "sn", "Iraque": "iq", "Noruega": "no",
  "Argentina": "ar", "Argélia": "dz", "Áustria": "at", "Jordânia": "jo",
  "Portugal": "pt", "Congo DR": "cd", "Uzbequistão": "uz", "Colômbia": "co",
  "Inglaterra": "gb-eng", "Croácia": "hr", "Gana": "gh", "Panamá": "pa",
};

export const DATAS_MATA_MATA = {

  oitavas: { inicio: "2026-06-28", fim: "2026-07-04" },

  quartas: { inicio: "2026-07-05", fim: "2026-07-07" },

  semi:    { inicio: "2026-07-14", fim: "2026-07-15" },

  final:   { data: "2026-07-19" },

};

