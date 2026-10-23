import type { Lang } from '@/utils/i18n';

// Copy for the per-platform landing pages. Claims must stay factual: no login,
// browser-only analysis, and only the follower/following lists are read.
export type LandingPlatform = 'threads' | 'tiktok';

export interface LandingCopy {
  h1: string;
  intro: string;
  stepsHeading: string;
  steps: { title: string; desc: string }[];
  featuresHeading: string;
  features: string[];
  privacy: string;
  faqHeading: string;
  faq: { q: string; a: string }[];
  cta: string;
  ctaNote: string;
}

export const landingRoutes: Record<LandingPlatform, string> = {
  threads: '/threads-unfollow-checker',
  tiktok: '/tiktok-unfollow-checker',
};

export const landingSeo: Record<LandingPlatform, { name: Record<Lang, string>; description: Record<Lang, string> }> = {
  threads: {
    name: {
      en: 'Threads Unfollow Checker',
      pt: 'Verificador de unfollow no Threads',
      ru: 'Проверка отписок в Threads',
      es: 'Verificador de unfollow en Threads',
    },
    description: {
      en: "See who doesn't follow you back on Threads from your official Threads data export. No login or password, analyzed in your browser.",
      pt: 'Veja quem não segue você de volta no Threads a partir da exportação oficial de dados. Sem login nem senha, com análise no seu navegador.',
      ru: 'Узнайте, кто не подписан на вас в ответ в Threads, по официальному экспорту данных. Без входа и пароля, анализ в вашем браузере.',
      es: 'Mira quién no te sigue de vuelta en Threads con la exportación oficial de tus datos. Sin inicio de sesión ni contraseña, análisis en tu navegador.',
    },
  },
  tiktok: {
    name: {
      en: 'TikTok Unfollow Checker',
      pt: 'Verificador de unfollow no TikTok',
      ru: 'Проверка отписок в TikTok',
      es: 'Verificador de unfollow en TikTok',
    },
    description: {
      en: "See who doesn't follow you back on TikTok from your official TikTok data download. No login or password, analyzed in your browser.",
      pt: 'Veja quem não segue você de volta no TikTok a partir do download oficial de dados. Sem login nem senha, com análise no seu navegador.',
      ru: 'Узнайте, кто не подписан на вас в ответ в TikTok, по официальной выгрузке данных. Без входа и пароля, анализ в вашем браузере.',
      es: 'Mira quién no te sigue de vuelta en TikTok con la descarga oficial de tus datos. Sin inicio de sesión ni contraseña, análisis en tu navegador.',
    },
  },
};

const shared: Record<Lang, Pick<LandingCopy, 'stepsHeading' | 'featuresHeading' | 'features' | 'faqHeading' | 'ctaNote'>> = {
  en: {
    stepsHeading: 'How it works',
    featuresHeading: "What you'll see",
    features: ["Accounts you follow that don't follow you back", "Followers you don't follow back", 'Mutual follows', 'Dated snapshots to compare changes later'],
    faqHeading: 'Frequently asked questions',
    ctaNote: 'Free preview. No login required.',
  },
  pt: {
    stepsHeading: 'Como funciona',
    featuresHeading: 'O que você vai ver',
    features: ['Contas que você segue e não seguem você de volta', 'Seguidores que você não segue de volta', 'Seguidores mútuos', 'Capturas datadas para comparar mudanças depois'],
    faqHeading: 'Perguntas frequentes',
    ctaNote: 'Prévia grátis. Sem login.',
  },
  ru: {
    stepsHeading: 'Как это работает',
    featuresHeading: 'Что вы увидите',
    features: ['Аккаунты, на которые вы подписаны, но они не подписаны на вас', 'Подписчики, на которых вы не подписаны', 'Взаимные подписки', 'Снимки с датами, чтобы позже сравнить изменения'],
    faqHeading: 'Частые вопросы',
    ctaNote: 'Бесплатный предпросмотр. Без входа в аккаунт.',
  },
  es: {
    stepsHeading: 'Cómo funciona',
    featuresHeading: 'Lo que verás',
    features: ['Cuentas que sigues y no te siguen de vuelta', 'Seguidores a los que no sigues de vuelta', 'Seguidores mutuos', 'Instantáneas con fecha para comparar cambios después'],
    faqHeading: 'Preguntas frecuentes',
    ctaNote: 'Vista previa gratis. Sin iniciar sesión.',
  },
};

const specific: Record<LandingPlatform, Record<Lang, Omit<LandingCopy, keyof typeof shared['en']>>> = {
  threads: {
    en: {
      h1: 'Threads unfollow checker without logging in',
      intro: "Find out who doesn't follow you back on Threads, who follows you that you don't follow, and your mutuals. SafeUnfollow reads the official data export from Meta's Accounts Center, so you never share your password.",
      steps: [
        { title: 'Request your Threads export', desc: 'In Accounts Center, open Your information and permissions → Export your information → Create export, then choose your Threads profile.' },
        { title: 'Choose the right options', desc: 'Threads has no "Followers and following" option, so select only "Threads". Set the date range to All time, the format to JSON, and media quality to Low.' },
        { title: 'Upload the ZIP', desc: 'When Meta notifies you, download the ZIP and upload it to SafeUnfollow without unzipping it.' },
      ],
      privacy: 'The ZIP is analyzed in your browser. SafeUnfollow does not upload your export to its servers and reads only the followers and following lists.',
      faq: [
        { q: 'Does SafeUnfollow need my Threads or Instagram password?', a: 'No. It works only from the export file you download from Meta. There is no login, OAuth, or API connection.' },
        { q: 'Why does the Threads export include my posts?', a: "Threads doesn't offer a followers-only export, so the ZIP also contains your posts and media. SafeUnfollow ignores everything except the followers and following lists." },
        { q: 'Can it show who unfollowed me on Threads?', a: 'One export shows your current relationships. To see who unfollowed you, save a dated snapshot and compare it with a later export.' },
        { q: 'Is the Threads export the same as my Instagram export?', a: 'No. Meta exports each profile separately. Export your Threads profile on its own and upload that ZIP.' },
      ],
      cta: 'Upload Threads ZIP',
    },
    pt: {
      h1: 'Verificador de unfollow no Threads sem fazer login',
      intro: 'Descubra quem não segue você de volta no Threads, quem segue você e você não segue, e seus seguidores mútuos. O SafeUnfollow lê a exportação oficial de dados da Central de Contas da Meta, então você nunca compartilha sua senha.',
      steps: [
        { title: 'Solicite a exportação do Threads', desc: 'Na Central de Contas, abra Suas informações e permissões → Exportar suas informações → Criar exportação e escolha seu perfil do Threads.' },
        { title: 'Escolha as opções certas', desc: 'O Threads não tem a opção "Seguidores e seguindo", então selecione apenas "Threads". Defina o período como Todo o período, o formato como JSON e a qualidade de mídia como Baixa.' },
        { title: 'Envie o ZIP', desc: 'Quando a Meta avisar, baixe o ZIP e envie para o SafeUnfollow sem descompactar.' },
      ],
      privacy: 'O ZIP é analisado no seu navegador. O SafeUnfollow não envia sua exportação para os servidores dele e lê apenas as listas de seguidores e seguindo.',
      faq: [
        { q: 'O SafeUnfollow precisa da minha senha do Threads ou do Instagram?', a: 'Não. Ele funciona apenas com o arquivo de exportação que você baixa da Meta. Não há login, OAuth nem conexão por API.' },
        { q: 'Por que a exportação do Threads inclui minhas publicações?', a: 'O Threads não oferece uma exportação só de seguidores, então o ZIP também traz suas publicações e mídias. O SafeUnfollow ignora tudo, exceto as listas de seguidores e seguindo.' },
        { q: 'Dá para ver quem deixou de me seguir no Threads?', a: 'Uma exportação mostra suas conexões atuais. Para ver quem deixou de seguir você, salve uma captura com data e compare com uma exportação posterior.' },
        { q: 'A exportação do Threads é a mesma do Instagram?', a: 'Não. A Meta exporta cada perfil separadamente. Exporte seu perfil do Threads sozinho e envie esse ZIP.' },
      ],
      cta: 'Enviar ZIP do Threads',
    },
    ru: {
      h1: 'Проверка отписок в Threads без входа в аккаунт',
      intro: 'Узнайте, кто не подписан на вас в ответ в Threads, кто подписан на вас без взаимности и с кем у вас взаимные подписки. SafeUnfollow читает официальный экспорт данных из Центра аккаунтов Meta, поэтому вам не нужно сообщать пароль.',
      steps: [
        { title: 'Запросите экспорт Threads', desc: 'В Центре аккаунтов откройте «Ваша информация и разрешения» → «Экспорт информации» → «Создать экспорт» и выберите профиль Threads.' },
        { title: 'Выберите нужные параметры', desc: 'В Threads нет пункта «Подписчики и подписки», поэтому выберите только «Threads». Укажите период «За всё время», формат JSON и низкое качество медиа.' },
        { title: 'Загрузите ZIP', desc: 'Когда Meta пришлёт уведомление, скачайте ZIP и загрузите его в SafeUnfollow, не распаковывая.' },
      ],
      privacy: 'ZIP анализируется в вашем браузере. SafeUnfollow не загружает экспорт на свои серверы и читает только списки подписчиков и подписок.',
      faq: [
        { q: 'Нужен ли SafeUnfollow пароль от Threads или Instagram?', a: 'Нет. Сервис работает только с файлом экспорта, который вы скачиваете у Meta. Нет входа, OAuth или подключения через API.' },
        { q: 'Почему в экспорт Threads попадают мои публикации?', a: 'Threads не позволяет выгрузить только подписчиков, поэтому в ZIP есть и публикации с медиа. SafeUnfollow игнорирует всё, кроме списков подписчиков и подписок.' },
        { q: 'Можно ли увидеть, кто отписался от меня в Threads?', a: 'Один экспорт показывает текущие связи. Чтобы увидеть отписки, сохраните снимок с датой и сравните его с более поздним экспортом.' },
        { q: 'Экспорт Threads — это то же самое, что экспорт Instagram?', a: 'Нет. Meta экспортирует каждый профиль отдельно. Экспортируйте профиль Threads отдельно и загрузите этот ZIP.' },
      ],
      cta: 'Загрузить ZIP Threads',
    },
    es: {
      h1: 'Verificador de unfollow en Threads sin iniciar sesión',
      intro: 'Descubre quién no te sigue de vuelta en Threads, quién te sigue y tú no sigues, y tus seguidores mutuos. SafeUnfollow lee la exportación oficial de datos del Centro de cuentas de Meta, así que nunca compartes tu contraseña.',
      steps: [
        { title: 'Solicita la exportación de Threads', desc: 'En el Centro de cuentas, abre Tu información y permisos → Exportar tu información → Crear exportación y elige tu perfil de Threads.' },
        { title: 'Elige las opciones correctas', desc: 'Threads no tiene la opción "Seguidores y seguidos", así que selecciona solo "Threads". Elige Todo el período, formato JSON y calidad multimedia baja.' },
        { title: 'Sube el ZIP', desc: 'Cuando Meta te avise, descarga el ZIP y súbelo a SafeUnfollow sin descomprimirlo.' },
      ],
      privacy: 'El ZIP se analiza en tu navegador. SafeUnfollow no sube tu exportación a sus servidores y solo lee las listas de seguidores y seguidos.',
      faq: [
        { q: '¿SafeUnfollow necesita mi contraseña de Threads o Instagram?', a: 'No. Funciona solo con el archivo de exportación que descargas de Meta. No hay inicio de sesión, OAuth ni conexión por API.' },
        { q: '¿Por qué la exportación de Threads incluye mis publicaciones?', a: 'Threads no ofrece una exportación solo de seguidores, así que el ZIP también trae tus publicaciones y archivos multimedia. SafeUnfollow ignora todo excepto las listas de seguidores y seguidos.' },
        { q: '¿Puedo ver quién dejó de seguirme en Threads?', a: 'Una exportación muestra tus relaciones actuales. Para ver quién dejó de seguirte, guarda una instantánea con fecha y compárala con una exportación posterior.' },
        { q: '¿La exportación de Threads es la misma que la de Instagram?', a: 'No. Meta exporta cada perfil por separado. Exporta tu perfil de Threads por su cuenta y sube ese ZIP.' },
      ],
      cta: 'Subir ZIP de Threads',
    },
  },
  tiktok: {
    en: {
      h1: 'TikTok unfollow checker without logging in',
      intro: 'Find out who doesn\'t follow you back on TikTok, who follows you that you don\'t follow, and your mutuals. SafeUnfollow reads TikTok\'s official "Download your data" file, so you never share your password.',
      steps: [
        { title: 'Request your TikTok data', desc: 'In TikTok, go to Profile → ☰ → Settings and privacy → Account → Download your data.' },
        { title: 'Choose JSON', desc: 'Select JSON as the file format and request the data. TikTok usually prepares it within a few days.' },
        { title: 'Upload the file', desc: 'Download it before the link expires, then upload the ZIP or the user_data_tiktok.json inside it.' },
      ],
      privacy: "The file is analyzed in your browser. TikTok's export also contains messages and other activity; SafeUnfollow reads only the follower and following lists and does not upload the file to its servers.",
      faq: [
        { q: 'Does SafeUnfollow need my TikTok password?', a: 'No. It works only from the file you download from TikTok. There is no login, OAuth, or API connection.' },
        { q: 'Why are some accounts missing?', a: 'Deleted or unavailable accounts appear as "N/A" in the export and are skipped. For very large accounts, TikTok may include only your most recent followers, and SafeUnfollow shows a warning when that happens.' },
        { q: 'Can it show who unfollowed me on TikTok?', a: 'One export shows your current relationships. To see who unfollowed you, save a dated snapshot and compare it with a later export.' },
        { q: 'Does the TXT format work?', a: 'No. Choose JSON when you request your TikTok data.' },
      ],
      cta: 'Upload TikTok data',
    },
    pt: {
      h1: 'Verificador de unfollow no TikTok sem fazer login',
      intro: 'Descubra quem não segue você de volta no TikTok, quem segue você e você não segue, e seus seguidores mútuos. O SafeUnfollow lê o arquivo oficial "Baixar seus dados" do TikTok, então você nunca compartilha sua senha.',
      steps: [
        { title: 'Solicite seus dados do TikTok', desc: 'No TikTok, vá em Perfil → ☰ → Configurações e privacidade → Conta → Baixar seus dados.' },
        { title: 'Escolha JSON', desc: 'Selecione JSON como formato de arquivo e solicite os dados. O TikTok costuma prepará-los em alguns dias.' },
        { title: 'Envie o arquivo', desc: 'Baixe antes de o link expirar e envie o ZIP ou o user_data_tiktok.json que está dentro dele.' },
      ],
      privacy: 'O arquivo é analisado no seu navegador. A exportação do TikTok também contém mensagens e outras atividades; o SafeUnfollow lê apenas as listas de seguidores e seguindo e não envia o arquivo para os servidores dele.',
      faq: [
        { q: 'O SafeUnfollow precisa da minha senha do TikTok?', a: 'Não. Ele funciona apenas com o arquivo que você baixa do TikTok. Não há login, OAuth nem conexão por API.' },
        { q: 'Por que algumas contas não aparecem?', a: 'Contas excluídas ou indisponíveis aparecem como "N/A" na exportação e são ignoradas. Em contas muito grandes, o TikTok pode incluir só os seguidores mais recentes, e o SafeUnfollow mostra um aviso quando isso acontece.' },
        { q: 'Dá para ver quem deixou de me seguir no TikTok?', a: 'Uma exportação mostra suas conexões atuais. Para ver quem deixou de seguir você, salve uma captura com data e compare com uma exportação posterior.' },
        { q: 'O formato TXT funciona?', a: 'Não. Escolha JSON ao solicitar seus dados do TikTok.' },
      ],
      cta: 'Enviar dados do TikTok',
    },
    ru: {
      h1: 'Проверка отписок в TikTok без входа в аккаунт',
      intro: 'Узнайте, кто не подписан на вас в ответ в TikTok, кто подписан на вас без взаимности и с кем у вас взаимные подписки. SafeUnfollow читает официальный файл «Скачать данные» из TikTok, поэтому вам не нужно сообщать пароль.',
      steps: [
        { title: 'Запросите данные TikTok', desc: 'В TikTok откройте «Профиль» → ☰ → «Настройки и конфиденциальность» → «Аккаунт» → «Скачать данные».' },
        { title: 'Выберите JSON', desc: 'Выберите формат файла JSON и отправьте запрос. Обычно TikTok готовит данные за несколько дней.' },
        { title: 'Загрузите файл', desc: 'Скачайте архив до истечения ссылки и загрузите ZIP или файл user_data_tiktok.json из него.' },
      ],
      privacy: 'Файл анализируется в вашем браузере. Экспорт TikTok содержит также сообщения и другую активность; SafeUnfollow читает только списки подписчиков и подписок и не загружает файл на свои серверы.',
      faq: [
        { q: 'Нужен ли SafeUnfollow пароль от TikTok?', a: 'Нет. Сервис работает только с файлом, который вы скачиваете из TikTok. Нет входа, OAuth или подключения через API.' },
        { q: 'Почему некоторых аккаунтов нет в списке?', a: 'Удалённые или недоступные аккаунты отображаются в экспорте как «N/A» и пропускаются. Для очень крупных аккаунтов TikTok может включать только последних подписчиков, и SafeUnfollow показывает предупреждение.' },
        { q: 'Можно ли увидеть, кто отписался от меня в TikTok?', a: 'Один экспорт показывает текущие связи. Чтобы увидеть отписки, сохраните снимок с датой и сравните его с более поздним экспортом.' },
        { q: 'Подходит ли формат TXT?', a: 'Нет. При запросе данных TikTok выберите JSON.' },
      ],
      cta: 'Загрузить данные TikTok',
    },
    es: {
      h1: 'Verificador de unfollow en TikTok sin iniciar sesión',
      intro: 'Descubre quién no te sigue de vuelta en TikTok, quién te sigue y tú no sigues, y tus seguidores mutuos. SafeUnfollow lee el archivo oficial "Descargar tus datos" de TikTok, así que nunca compartes tu contraseña.',
      steps: [
        { title: 'Solicita tus datos de TikTok', desc: 'En TikTok, ve a Perfil → ☰ → Ajustes y privacidad → Cuenta → Descargar tus datos.' },
        { title: 'Elige JSON', desc: 'Selecciona JSON como formato de archivo y solicita los datos. TikTok suele prepararlos en unos días.' },
        { title: 'Sube el archivo', desc: 'Descárgalo antes de que caduque el enlace y sube el ZIP o el user_data_tiktok.json que contiene.' },
      ],
      privacy: 'El archivo se analiza en tu navegador. La exportación de TikTok también contiene mensajes y otra actividad; SafeUnfollow solo lee las listas de seguidores y seguidos y no sube el archivo a sus servidores.',
      faq: [
        { q: '¿SafeUnfollow necesita mi contraseña de TikTok?', a: 'No. Funciona solo con el archivo que descargas de TikTok. No hay inicio de sesión, OAuth ni conexión por API.' },
        { q: '¿Por qué faltan algunas cuentas?', a: 'Las cuentas eliminadas o no disponibles aparecen como "N/A" en la exportación y se omiten. En cuentas muy grandes, TikTok puede incluir solo tus seguidores más recientes, y SafeUnfollow muestra un aviso cuando ocurre.' },
        { q: '¿Puedo ver quién dejó de seguirme en TikTok?', a: 'Una exportación muestra tus relaciones actuales. Para ver quién dejó de seguirte, guarda una instantánea con fecha y compárala con una exportación posterior.' },
        { q: '¿Funciona el formato TXT?', a: 'No. Elige JSON al solicitar tus datos de TikTok.' },
      ],
      cta: 'Subir datos de TikTok',
    },
  },
};

export function landingCopy(platform: LandingPlatform, lang: Lang): LandingCopy {
  return { ...shared[lang], ...specific[platform][lang] };
}
