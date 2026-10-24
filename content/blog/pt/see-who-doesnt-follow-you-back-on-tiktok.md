---
title: "Como Ver Quem Não Segue Você de Volta no TikTok Sem Fazer Login"
description: "Descubra quem não segue você de volta no TikTok com o download oficial de dados. Sem login nem senha, análise no navegador e os limites da exportação."
date: 2026-10-24
slug: "see-who-doesnt-follow-you-back-on-tiktok"
cluster: "instagram-unfollow"
keywords:
  - "quem não me segue de volta no tiktok"
  - "verificador de unfollow tiktok"
  - "quem deixou de me seguir no tiktok"
  - "baixar seus dados tiktok json"
  - "SafeUnfollow"
---
Para ver quem não segue você de volta no TikTok, solicite seus dados na página "Baixar seus dados" do TikTok em formato JSON e compare as listas de seguidores e seguindo do arquivo. O TikTok mostra as duas listas no app, mas nunca lado a lado. Os apps que fazem essa comparação costumam pedir seu login do TikTok. O arquivo de dados dá a mesma resposta sem entregar sua conta.

Este guia mostra os passos da solicitação, o que vem na exportação do TikTok e um limite específico do TikTok que vale conhecer antes de confiar no resultado.

## Como baixar seus dados do TikTok

1. No TikTok, abra **Perfil → ☰ → Configurações e privacidade → Conta → Baixar seus dados**.
2. Escolha **JSON** como formato de arquivo. O formato TXT não pode ser analisado.
3. Solicite os dados. O TikTok costuma prepará-los em alguns dias.
4. Quando estiverem prontos, baixe o arquivo na mesma página antes de o link expirar.
5. Envie o ZIP, ou o arquivo `user_data_tiktok.json` que está dentro dele, para o [SafeUnfollow](/pt/upload).

Não é preciso descompactar nada. Se o navegador ou o celular já descompactou o download, envie o arquivo JSON diretamente.

## O que vem na exportação do TikTok

O arquivo de dados do TikTok cobre muito mais do que seguidores. Ele inclui seu perfil, sua atividade e suas mensagens diretas. É um bom motivo para tomar cuidado com onde você envia esse arquivo.

O SafeUnfollow lê só duas partes do arquivo: a lista de seguidores e a lista de seguindo. Todo o resto é ignorado. A análise acontece no seu navegador, e o arquivo não é enviado para os servidores do SafeUnfollow. Não há login, OAuth nem conexão por API com sua conta do TikTok, o que mantém o método focado em privacidade e evita acesso direto à conta.

Com essas duas listas você vê:

- **Só você segue**: contas que você segue e que não seguem você
- **Só seguem você**: seguidores que você não seguiu de volta
- **Mútuos**: contas em que o follow é dos dois lados

As primeiras 20 contas de cada lista são grátis. O Acesso Vitalício (pagamento único de US$14,99, ajustado ao seu país, sem assinatura) libera listas completas, busca, exportação CSV, capturas ilimitadas e histórico de mudanças.

## O limite do TikTok que quase ninguém menciona

Em contas com muitos seguidores, a exportação do TikTok pode incluir só os seguidores mais recentes, e não a lista completa. A seção de perfil do mesmo arquivo continua registrando seu número real de seguidores, então a diferença aparece na própria exportação.

Quando a lista de seguidores da exportação é bem menor do que seu número de seguidores, o SafeUnfollow mostra um aviso. Nesse caso, algumas pessoas em "Só você segue" podem na verdade seguir você. São seguidores antigos que o TikTok deixou fora da exportação. Use essa lista como ponto de partida e confira alguns nomes no app antes de agir.

A exportação também marca contas excluídas ou indisponíveis como "N/A". O SafeUnfollow ignora essas entradas, então os números podem ficar um pouco abaixo do arquivo bruto.

## Como ver quem deixou de seguir você no TikTok

Uma exportação mostra suas conexões no dia em que o TikTok preparou o arquivo. Ela não diz quem deixou de seguir você, só quem não segue você agora.

Para acompanhar unfollows, salve o resultado como captura, solicite um novo download de dados depois e compare os dois. Contas que estavam na lista de seguidores antiga e não estão na nova pararam de seguir você entre essas datas. Nosso guia sobre [rastrear mudanças de seguidores ao longo do tempo](/pt/blog/track-instagram-follower-changes-over-time) explica como a comparação de capturas funciona.

Capturas do TikTok são comparadas só com outras capturas do TikTok, nunca com Instagram ou Threads.

## Perguntas frequentes (FAQ)

### O SafeUnfollow precisa da minha senha do TikTok?

Não. Ele funciona só com o arquivo que você baixa do TikTok. Não há login, OAuth nem conexão por API.

### Por que o SafeUnfollow diz que minha lista de seguidores está incompleta?

A exportação do TikTok pode incluir só os seguidores mais recentes quando você tem muitos. O SafeUnfollow compara a lista com seu número de seguidores e avisa quando a diferença é grande.

### Devo enviar o ZIP ou o arquivo JSON?

Os dois funcionam. Envie o ZIP como foi baixado, ou o arquivo `user_data_tiktok.json` que está dentro dele.

### Meu envio falhou. O que verifico primeiro?

Confira se você escolheu JSON, e não TXT, ao solicitar os dados. Se escolheu TXT, solicite um novo download em JSON.

### Funciona para Instagram e Threads?

Sim, com a exportação de cada plataforma. Para o Threads, veja [como conferir seguidores do Threads](/pt/blog/see-who-doesnt-follow-you-back-on-threads). Para o Instagram, envie o ZIP da sua exportação de dados do Instagram da mesma forma.

Quer a versão curta? A página do [verificador de unfollow no TikTok](/pt/tiktok-unfollow-checker) mostra os passos em uma tela.

Comece pelo [guia completo de Instagram Unfollow](/pillars/instagram-unfollow-guide) para uma visão geral do assunto.

## Artigos relacionados

- [Como Analisar sua Exportação de Dados do Instagram Sem Fazer Login](/pt/blog/how-to-analyze-instagram-data-export)

[Envie seus dados do TikTok para o SafeUnfollow](https://safeunfollow.com/pt/upload)
