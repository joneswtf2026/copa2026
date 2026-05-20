# Bolão Copa 2026

Site de bolão para a Copa do Mundo 2026, com login Google, palpites por fase, pagamento via Pix e ranking em tempo real.

## Setup em 5 passos

### 1. Firebase — habilitar serviços

No [Firebase Console](https://console.firebase.google.com), no projeto `copa2026-ca9d0`:

- **Authentication** → Sign-in method → habilitar **Google**
- **Firestore Database** → criar banco em modo de produção
- **Firestore** → aba Regras → colar o conteúdo de `firestore.rules`

### 2. Descobrir seu UID de admin

1. Abra o site no navegador
2. Faça login com sua conta Google
3. Abra o console do navegador (F12)
4. Procure a linha: `"UID do usuário: XXXX..."` — copie esse valor

### 3. Configurar o UID de admin

Edite **dois arquivos** com seu UID:

**`firebase-config.js`:**
```js
export const ADMIN_UID = "cole_seu_uid_aqui";
```

**`firestore.rules`:**
```
function isAdmin() {
  return request.auth != null && request.auth.uid == "cole_seu_uid_aqui";
}
```

Depois republique as regras no Firebase Console.

### 4. Configurar a chave Pix

Após fazer login como admin, vá em **Administração → Configuração Pix** e preencha:
- Chave Pix (CPF, email, telefone ou chave aleatória)
- Nome do recebedor
- Cidade

### 5. Deploy no GitHub Pages

O site já está configurado para funcionar no GitHub Pages. Basta fazer push para o repositório.

**URL de acesso:** `https://SEU_USUARIO.github.io/Copa2026/Site Bolão/`

---

## Como funciona

### Para os participantes
1. Acessam o site e fazem login com Google
2. Vão em **Palpites** e escolhem os jogos que querem palpitar
3. Digitam o placar que acham que vai acontecer
4. Clicam em **Confirmar e Pagar** — veem o QR Code Pix com o valor total
5. Pagam o Pix e clicam em "Já paguei"
6. O admin aprova o pagamento no painel
7. Os palpites ficam confirmados e os pontos são calculados automaticamente

### Para o admin
- **Administração** → aprovar/rejeitar pagamentos pendentes
- **Administração** → inserir resultados dos jogos
- Os pontos são calculados automaticamente após inserir o resultado
- O ranking e os prêmios atualizam em tempo real

### Custo por palpite
| Fase | Custo |
|------|-------|
| Grupos | R$ 0,50 |
| Oitavas | R$ 2,00 |
| Quartas | R$ 5,00 |
| Semifinal | R$ 10,00 |
| Final | R$ 20,00 |

### Pontuação
| Fase | Acertou vencedor | Acertou placar exato | Acertou empate |
|------|-----------------|---------------------|----------------|
| Grupos | 1 pt | 3 pts | 2 pts |
| Oitavas | 4 pts | 6 pts | — |
| Quartas | 8 pts | 10 pts | — |
| Semifinal | 15 pts | 20 pts | — |
| Final | 30 pts | 50 pts | — |

### Distribuição do prêmio
| Prêmio | % do balde |
|--------|-----------|
| Campeão geral (melhor pontuação total) | 50% |
| Rei da fase de grupos | 30% |
| Rei das quartas | 7% |
| Rei da semifinal | 10% |
| Rei das oitavas | 3% |

---

## Estrutura de arquivos

```
Site Bolão/
├── index.html          — HTML principal
├── style.css           — Estilos
├── app.js              — Lógica principal (Firebase, palpites, ranking)
├── data.js             — Jogos, grupos, pontuação, chaveamento
├── firebase-config.js  — Configuração Firebase + UID admin
├── firestore.rules     — Regras de segurança do Firestore
├── manifest.json       — PWA manifest
└── README.md           — Este arquivo
```
