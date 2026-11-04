import type { Metadata } from "next";
import Link from "next/link";
import { Secao, Titulo } from "@/components/ui/StatTile";
import { AUTOR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados o MonitoraDeputado coleta de quem usa o site, para quê, e como pedir para apagar.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Titulo sub="Em linguagem simples: o que é guardado, por quê e como você controla.">Política de privacidade</Titulo>

      <Secao titulo="Quem cuida dos dados">
        <p className="text-sm">
          O MonitoraDeputado é mantido por {AUTOR.nome}, que decide como os dados de quem usa o site são tratados (controlador, nos termos da
          Lei Geral de Proteção de Dados, a LGPD). O contato para qualquer pedido é a página <Link href="/contato/" className="text-destaque underline">Contato</Link>.
        </p>
      </Secao>

      <Secao titulo="O que é coletado">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li><strong>Cadastro por e-mail</strong> (só se você preencher): seu e-mail, o que você quis acompanhar (por exemplo, um deputado), a página de onde veio,
            o canal de chegada, a cidade e o estado aproximados (para mandar novidades da sua região) e a data.
            Base legal: o seu consentimento, dado ao marcar a caixinha.</li>
          <li><strong>Formulário de contato</strong> (só se você enviar): assunto, nome, e-mail e/ou WhatsApp e a mensagem. Base legal: atender ao seu pedido.</li>
          <li><strong>Acessos</strong>: uma linha por página vista, com a página e o conteúdo (por exemplo, qual deputado foi consultado), o site de
            origem (só o domínio, como &ldquo;google.com&rdquo;) e o canal (WhatsApp, Instagram, busca…), as marcações de campanha do link (utm), o tipo
            de aparelho (celular, tablet ou computador), a família do sistema e do navegador (como &ldquo;Android&rdquo; e &ldquo;Chrome&rdquo;, sem
            versão nem modelo), o idioma, o fuso horário, o tema claro/escuro, se é a primeira visita neste navegador e um código aleatório que só
            agrupa as páginas de uma mesma visita. Também registramos o uso de recursos, como exportar dados ou marcar um deputado com estrela
            (só o nome do recurso, nunca o que você digitou).</li>
          <li><strong>Localização aproximada</strong>: cidade, estado e país estimados pela rede, informados pelo próprio servidor que hospeda o site.
            <strong> O endereço IP não é guardado</strong> nem enviado à planilha. Não usamos GPS nem pedimos sua localização.</li>
          <li><strong>O que nunca é coletado</strong>: IP, nome, CPF, texto digitado na busca, cookies de rastreamento ou identificadores de publicidade.
            Se o seu navegador envia o sinal &ldquo;Não rastrear&rdquo;, nada de acesso é registrado. Base legal dos acessos: legítimo interesse em
            entender, de forma agregada, como o site é usado (art. 7º, IX, da LGPD).</li>
          <li><strong>&ldquo;Meus deputados&rdquo;</strong> continua só no seu navegador e nunca é enviado a lugar nenhum.</li>
        </ul>
      </Secao>

      <Secao titulo="Para que usamos">
        <p className="text-sm">
          Para enviar o resumo semanal e avisos sobre os deputados que você escolheu acompanhar, responder mensagens e entender, de forma agregada, quais
          páginas são mais úteis. Os dados ficam numa planilha de acesso restrito ao responsável e <strong>não são vendidos nem repassados</strong> a terceiros;
          ferramentas de envio de e-mail e de armazenamento podem processá-los em nome do projeto.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p className="text-sm">
          Você pode pedir para ver, corrigir ou apagar seus dados, ou cancelar os e-mails, a qualquer momento: escolha o assunto
          &ldquo;Cancelar e-mails ou apagar meus dados&rdquo; em <Link href="/contato/" className="text-destaque underline">Contato</Link>. Cada e-mail enviado
          também terá um modo simples de sair da lista.
        </p>
      </Secao>

      <Secao titulo="Dados dos deputados">
        <p className="text-sm">
          Os números sobre os parlamentares vêm de fontes públicas oficiais (veja <Link href="/sobre/" className="text-destaque underline">Metodologia e fontes</Link>)
          e tratam da atuação pública deles. O projeto não coleta nem usa e-mails de servidores ou de gabinetes para divulgação.
        </p>
      </Secao>

      <p className="text-xs text-muted">Texto informativo escrito para este projeto; não substitui orientação jurídica. Atualizado em 04/11/2026.</p>
    </div>
  );
}
