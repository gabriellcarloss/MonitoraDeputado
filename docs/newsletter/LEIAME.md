# Newsletter semanal — instalação (uma vez, uns 10 minutos)

Os e-mails saem de **gabriel.carlos@gcarlosdados.com**. Tudo roda nessa conta.

## 1. Dar acesso à planilha
Na planilha "MonitoraDeputado — Controle", clique em **Compartilhar** e adicione
`gabriel.carlos@gcarlosdados.com` como **Editor**.

## 2. Criar o script (logado em gabriel.carlos@gcarlosdados.com)
1. Abra https://script.google.com → **Novo projeto** → nome: `MonitoraDeputado Newsletter`.
2. Apague o conteúdo e cole todo o arquivo `Newsletter.gs`. Salve.
3. Execute **configurar** (autorize quando o Google pedir: planilha, e-mail e gatilhos).
   Isso cria as colunas *Nome, Newsletter, Boas-vindas em, Último envio, Último erro* na aba Cadastros,
   o segredo do link de cancelar e os dois gatilhos (um envio por dia às 8h).
4. Execute **testar**: chegam 3 e-mails de exemplo em gabriel.carlos@gcarlosdados.com. Confira o visual.

## 3. Ligar o link "Cancelar o recebimento"
**Implantar → Nova implantação → App da Web** → Executar como: *Eu* · Quem tem acesso: *Qualquer pessoa* → Implantar.
Copie a URL do app e, em **Configurações do projeto → Propriedades do script**, crie `URL_APP` com essa URL.

## 4. Campo "Nome" no site
Atualize o script ligado à planilha (o `Code.gs` de `docs/apps-script/`, que já inclui a coluna Nome) e rode **configurar**.
Quem se cadastrar depois disso informa o primeiro nome; quem já estava na lista recebe a saudação sem nome.

## Enviar agora para quem já está cadastrado
Depois do passo 4, escolha **enviarResumoDiario** e clique em **Executar**: todo mundo que já está na aba Cadastros com Consentimento = sim
recebe na hora o e-mail de boas-vindas com o resumo. A partir de amanhã, o gatilho das 8h repete isso uma vez por dia.

## Como funciona
- **Todo dia 8h** (e quando você executa `enviarResumoDiario`): quem tem Consentimento = sim e nunca recebeu nada ganha o e-mail de agradecimento
  com os últimos 7 dias do interesse escolhido (um deputado, pela coluna Origem `deputado-<id>`, ou o resumo geral). Quem já recebeu ganha, no máximo uma vez por dia, o acumulado dos últimos 7 dias.
- **Cancelar**: o link do rodapé grava `descadastrado` na coluna *Newsletter*. Para pausar alguém à mão, escreva `pausado` nela.
- **Erros**: ficam na coluna *Último erro* da linha. Limite de segurança: 80 e-mails por execução.
- Os fatos vêm de `/data/semanal/<id>.json` e `/data/semanal/geral.json` no site, gerados todo dia com os dados oficiais da Câmara.
