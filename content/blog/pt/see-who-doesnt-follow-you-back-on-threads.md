---
title: "Como Ver Quem Não Segue Você de Volta no Threads Sem Fazer Login"
description: "Descubra quem não segue você de volta no Threads com a exportação oficial da Meta. Sem login nem senha, análise no navegador e as configurações certas."
date: 2026-10-24
slug: "see-who-doesnt-follow-you-back-on-threads"
cluster: "instagram-unfollow"
keywords:
  - "quem não me segue de volta no threads"
  - "verificador de unfollow threads"
  - "quem deixou de me seguir no threads"
  - "exportar seguidores do threads"
  - "SafeUnfollow"
---
Para ver quem não segue você de volta no Threads, exporte os dados do seu perfil do Threads pela Central de Contas da Meta e compare as listas de seguidores e seguindo que vêm no arquivo. O próprio Threads não tem uma tela de "não me segue de volta", e a maioria dos apps que oferecem isso pede seu login. A exportação dá a mesma resposta a partir de um arquivo que você controla.

Este guia mostra as configurações de exportação que funcionam, o que o SafeUnfollow lê do arquivo e o que uma única exportação pode ou não pode dizer.

## Por que o Threads precisa de uma exportação própria

Os perfis do Threads são gerenciados pela Central de Contas da Meta, o mesmo lugar onde você exporta os dados do Instagram. Por isso é fácil achar que uma exportação cobre os dois. Não cobre. A Meta exporta cada perfil separadamente: o ZIP do Instagram não tem seguidores do Threads, e o ZIP do Threads não tem seguidores do Instagram.

A outra diferença pega muita gente. No Instagram dá para exportar só "Seguidores e seguindo". O Threads não tem essa opção. Você seleciona a categoria "Threads" inteira, que também inclui suas publicações e mídias. Por isso a qualidade de mídia importa: escolha Baixa para manter o arquivo pequeno.

## Como exportar seguidores e seguindo do Threads

1. Abra a Central de Contas e vá em **Suas informações e permissões → Exportar suas informações → Criar exportação**.
2. Escolha seu perfil do **Threads**, não o do Instagram.
3. Selecione apenas **Threads** como informação a incluir.
4. Defina o período como **Todo o período**, o formato como **JSON** e a qualidade de mídia como **Baixa**.
5. Quando a Meta avisar que a exportação está pronta, baixe o ZIP.
6. Envie o ZIP para o [SafeUnfollow](/pt/upload) sem descompactar.

Duas configurações causam a maioria das falhas. Uma exportação em **HTML** não pode ser lida, então solicite outra em JSON. Um período curto, como "Último ano", pode deixar de fora seguidores de anos anteriores, então escolha sempre Todo o período.

## O que o SafeUnfollow lê do arquivo

O ZIP do Threads tem muito mais do que suas listas de seguidores. O SafeUnfollow ignora publicações e mídias e lê apenas as listas de seguidores e seguindo.

A análise acontece no seu navegador. O SafeUnfollow não envia sua exportação para os servidores dele e nunca pede sua senha do Threads ou do Instagram. Não há login, OAuth nem conexão por API, então não existe token de sessão para ninguém usar indevidamente. É uma forma de responder à pergunta com foco em privacidade, sem tocar na sua conta.

Com essas duas listas você vê três grupos:

- **Só você segue**: contas que você segue no Threads e que não seguem você
- **Só seguem você**: contas que seguem você e que você não segue de volta
- **Mútuos**: contas em que o follow é dos dois lados

As primeiras 20 contas de cada lista são grátis. O Acesso Vitalício (pagamento único de US$14,99, ajustado ao seu país, sem assinatura) libera listas completas, busca, exportação CSV, capturas ilimitadas e histórico de mudanças.

## Não seguir de volta não é o mesmo que deixar de seguir

Uma exportação é um retrato das suas conexões no dia em que a Meta preparou o arquivo. Ela mostra quem não segue você de volta agora. Não diz se essas contas já seguiram você e pararam, ou se nunca seguiram.

Para ver quem deixou de seguir você no Threads, salve o resultado como captura, solicite outra exportação depois e compare as duas. Contas que aparecem na lista de seguidores antiga e não na nova pararam de seguir você em algum momento entre as duas datas. O mesmo método funciona no Instagram, e nosso guia sobre [rastrear mudanças de seguidores ao longo do tempo](/pt/blog/track-instagram-follower-changes-over-time) explica em detalhes.

As capturas são comparadas só dentro da mesma plataforma. Uma captura do Threads nunca é comparada com uma do Instagram, porque as listas de seguidores são separadas.

## Limites antes de começar

- A Meta controla quanto tempo a exportação leva. Solicite antes de precisar do resultado.
- A comparação mostra que algo mudou entre duas datas, não o dia exato.
- Uma conta desativada ou excluída some da lista do mesmo jeito que um unfollow, então os dois casos não se distinguem.
- Se a Meta mudar o formato da exportação, o leitor pode precisar de atualização antes de ler arquivos novos.

## Perguntas frequentes (FAQ)

### O SafeUnfollow precisa da minha senha do Threads ou do Instagram?

Não. Ele funciona só com o arquivo que você baixa da Meta. Não há login, OAuth nem conexão por API.

### Posso usar minha exportação de dados do Instagram para o Threads?

Não. A Meta exporta cada perfil separadamente. A exportação de dados do Instagram não inclui seguidores do Threads, então exporte o perfil do Threads à parte.

### Por que minha exportação do Threads é tão grande?

O Threads não tem opção só de seguidores, então o ZIP inclui publicações e mídias. Qualidade de mídia Baixa mantém o arquivo pequeno. O SafeUnfollow lê só as listas de seguidores de qualquer forma.

### Devo enviar o ZIP ou descompactar antes?

Envie o ZIP como está. O SafeUnfollow encontra os arquivos de seguidores e seguindo dentro dele.

### Funciona para o TikTok também?

Sim. O TikTok usa o próprio arquivo de "Baixar seus dados", e os passos são diferentes. Veja [como conferir seguidores do TikTok](/pt/blog/see-who-doesnt-follow-you-back-on-tiktok).

Quer a versão curta? A página do [verificador de unfollow no Threads](/pt/threads-unfollow-checker) mostra os passos em uma tela.

Comece pelo [guia completo de Instagram Unfollow](/pillars/instagram-unfollow-guide) para uma visão geral do assunto.

## Artigos relacionados

- [Como Analisar sua Exportação de Dados do Instagram Sem Fazer Login](/pt/blog/how-to-analyze-instagram-data-export)

[Envie seus dados do Threads para o SafeUnfollow](https://safeunfollow.com/pt/upload)
