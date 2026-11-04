# Coleta de cadastros, contatos e acessos (Google Sheets)

O site é estático e não tem servidor. Por isso o cadastro de e-mail, o formulário de contato e o registro de acessos
gravam numa **planilha do Google** por meio de um **Apps Script** publicado como "App da Web". Sem o passo 4 abaixo
a coleta fica desligada: os formulários não aparecem e nada é enviado.

## Instalação (uma vez só, uns 5 minutos)

1. Crie uma planilha nova no Google Sheets (ex.: "MonitoraDeputado — Controle"). Ela deve ficar privada, só com a sua conta.
2. Em **Extensões → Apps Script**, apague o conteúdo e cole o arquivo [`apps-script/Code.gs`](apps-script/Code.gs).
   Salve, escolha a função `configurar` e clique em **Executar** (autorize o acesso quando o Google pedir).
   Isso cria as abas **Cadastros**, **Contatos** e **Acessos** com os cabeçalhos.
3. Clique em **Implantar → Nova implantação → App da Web**:
   - *Executar como*: **Eu**
   - *Quem pode acessar*: **Qualquer pessoa**
   Copie o endereço que termina em `/exec`.
4. No GitHub, em **Settings → Secrets and variables → Actions → Variables**, crie a variável **`COLETA_URL`** com esse endereço.
   Rode o fluxo **Actions → Atualizar dados e publicar → Run workflow** (ou espere a próxima execução das 04:00).

Se mudar o script depois, use **Implantar → Gerenciar implantações → editar → Nova versão**; o endereço continua o mesmo.

## Atualizar para a versão 2 (novembro de 2026)

1. Abra a planilha → **Extensões → Apps Script**, apague tudo e cole o novo [`apps-script/Code.gs`](apps-script/Code.gs). Salve.
2. Escolha a função **`configurar`** e clique em **Executar**. O Google pede uma autorização nova (o script passa a ler a lista pública de
   deputados do site para completar as linhas antigas). Isso:
   - acrescenta as colunas novas **no fim** das abas (nada do que já existe sai do lugar);
   - preenche Deputado/Partido/UF nas linhas antigas de páginas de deputado;
   - cria a aba **Painel**, com totais e gráficos (por dia, deputados e páginas mais vistos, canal, estado, cidade, dispositivo, hora e recursos usados).
     A aba Dashboard feita à mão não é alterada.
3. **Implantar → Gerenciar implantações → (lápis) editar → Versão: Nova versão → Implantar.** O endereço `/exec` continua o mesmo.

## O que cai em cada aba

| Aba | Quando | Colunas |
| --- | --- | --- |
| Cadastros | pessoa preenche o e-mail e marca o consentimento | Data, E-mail, Interesse, Origem, Consentimento, Status |
| Contatos | formulário da página `/contato/` | Data, Tipo, Nome, E-mail, WhatsApp, Mensagem, Origem, Status |
| Acessos | uma linha por página vista e por recurso usado | Data, Página, Veio de, utm_*, Dispositivo, Sessão, Evento, Título da página, Deputado, Partido, UF do deputado, ID do deputado, Parâmetros, Canal, Cidade (aprox.), Estado (aprox.), País, Fuso horário, Idioma, Sistema, Navegador, Tema, Visitante, Nº da página na visita, Detalhe |

- E-mails repetidos no cadastro não geram nova linha.
- A coluna **Status** é sua: use para marcar "novo", "respondido", "cliente" etc.
- Acessos não guardam IP nem cookies, e respeitam o sinal "Não rastrear" do navegador. Tráfego de `localhost` não conta.
- A cidade/UF vem da função `/api/geo` (web/public/api/geo.js), que roda na Vercel e devolve só a cidade estimada pela rede; o IP não sai de lá.
- Eventos registrados: `pagina`, `exportar` (detalhe: tabela · formato), `favoritar`, `desfavoritar`, `compartilhar`.
- Para saber de onde vieram as visitas, divulgue links com marcação, por exemplo
  `https://monitoradeputado.vercel.app/?utm_source=linkedin&utm_campaign=lancamento`.

## Limites a conhecer

- O navegador não consegue ler a resposta do Google, então a tela de "pronto" aparece quando o envio sai sem erro de rede.
  A validação real (e-mail válido, consentimento, robôs) é refeita no script; confira a planilha nos primeiros testes.
- O Apps Script tem cota diária de execuções. Para um pico de tráfego muito grande, o registro de acessos pode ser o primeiro a falhar
  (cadastros e contatos são poucos). Se isso acontecer, dá para migrar os acessos para uma ferramenta própria de estatísticas.
- Enviar o resumo semanal exige uma ferramenta de e-mail (Brevo, MailerLite etc.): importe a aba **Cadastros** para ela.
  Mantenha sempre o link de descadastro e só envie para quem se cadastrou.
