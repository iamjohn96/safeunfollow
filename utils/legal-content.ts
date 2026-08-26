import type { Lang } from './translations';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDocument {
  title: string;
  updated: string;
  sections: LegalSection[];
  back: string;
}

export const privacyContent: Record<Lang, LegalDocument> = {
  en: {
    title: 'Privacy Policy', updated: 'Last updated: August 2026', back: 'Back to home',
    sections: [
      { title: '1. No Data Collection', paragraphs: ['SafeUnfollow processes your Instagram data entirely in your browser. Uploaded files, follower data, and following data never leave your device.', 'The analyzer reads only the follower and following relationship files required for mutual connections, one-way follows, and snapshot changes. It does not analyze messages, posts, photos, videos, contacts, or other export files.'] },
      { title: '2. Local Storage', paragraphs: ['Snapshots and parsed data are stored only in your browser localStorage. You can remove them at any time by clearing your browser data.'] },
      { title: '3. Premium Accounts and Payments', paragraphs: ['If you buy Premium, we store your email address solely to verify access and support subscription operations. Dodo Payments processes payments; SafeUnfollow does not store card information. We do not sell your email address.'] },
      { title: '4. Analytics', paragraphs: ['We may collect anonymous, aggregated usage metrics such as page views, language, and funnel events. Instagram export contents, usernames, and uploaded files are not included in analytics events.'] },
      { title: '5. Cookies', paragraphs: ['We do not use advertising tracking cookies. Strictly necessary storage may be used for Premium verification and service operation.'] },
      { title: '6. Third-Party Services', paragraphs: ['Dodo Payments and analytics providers apply their own privacy policies. External links, including instagram.com, are provided for convenience and are outside our control.'] },
      { title: '7. Children', paragraphs: ['SafeUnfollow is not directed to children under 13, and we do not knowingly collect their data.'] },
      { title: '8. Changes', paragraphs: ['We may update this policy. Continued use after an update constitutes acceptance of the revised policy.'] },
      { title: '9. Contact', paragraphs: ['Questions may be sent to privacy@safeunfollow.com.'] },
    ],
  },
  pt: {
    title: 'Política de Privacidade', updated: 'Última atualização: agosto de 2026', back: 'Voltar ao início',
    sections: [
      { title: '1. Nenhuma coleta do arquivo', paragraphs: ['O SafeUnfollow processa seus dados do Instagram inteiramente no navegador. Arquivos enviados e listas de seguidores e seguidos nunca saem do dispositivo.', 'O analisador lê somente os arquivos de relacionamentos necessários para conexões mútuas, relações unilaterais e mudanças entre capturas. Mensagens, publicações, fotos, vídeos, contatos e outros arquivos não são analisados.'] },
      { title: '2. Armazenamento local', paragraphs: ['Capturas e dados processados ficam apenas no localStorage do navegador. Você pode removê-los a qualquer momento limpando os dados do navegador.'] },
      { title: '3. Premium e pagamentos', paragraphs: ['Ao comprar o Premium, armazenamos seu e-mail somente para verificar o acesso e operar a assinatura. Os pagamentos são processados pela Dodo Payments; o SafeUnfollow não armazena dados do cartão nem vende seu e-mail.'] },
      { title: '4. Analytics', paragraphs: ['Podemos coletar métricas anônimas e agregadas, como visualizações, idioma e etapas do funil. Conteúdo do ZIP, nomes de usuário e arquivos enviados nunca fazem parte desses eventos.'] },
      { title: '5. Cookies', paragraphs: ['Não usamos cookies de publicidade. Armazenamento estritamente necessário pode ser usado para verificar o Premium e operar o serviço.'] },
      { title: '6. Serviços de terceiros', paragraphs: ['Dodo Payments e provedores de analytics possuem políticas próprias. Links externos, como instagram.com, estão fora do nosso controle.'] },
      { title: '7. Crianças', paragraphs: ['O SafeUnfollow não é direcionado a menores de 13 anos e não coleta conscientemente seus dados.'] },
      { title: '8. Alterações', paragraphs: ['Podemos atualizar esta política. O uso contínuo após uma alteração representa aceitação da versão atualizada.'] },
      { title: '9. Contato', paragraphs: ['Envie dúvidas para privacy@safeunfollow.com.'] },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности', updated: 'Обновлено: август 2026 г.', back: 'На главную',
    sections: [
      { title: '1. Файлы не собираются', paragraphs: ['SafeUnfollow обрабатывает данные Instagram полностью в браузере. Загруженные файлы и списки подписчиков и подписок не покидают устройство.', 'Анализатор читает только файлы связей, необходимые для взаимных и односторонних подписок и изменений снимков. Сообщения, публикации, фото, видео, контакты и другие файлы не анализируются.'] },
      { title: '2. Локальное хранение', paragraphs: ['Снимки и обработанные данные хранятся только в localStorage браузера. Их можно удалить, очистив данные браузера.'] },
      { title: '3. Премиум и платежи', paragraphs: ['При покупке Премиум мы храним e-mail только для проверки доступа и операций с подпиской. Платежи обрабатывает Dodo Payments; SafeUnfollow не хранит данные карты и не продаёт ваш e-mail.'] },
      { title: '4. Аналитика', paragraphs: ['Мы можем собирать анонимные агрегированные метрики: просмотры, язык и этапы воронки. Содержимое ZIP, имена пользователей и файлы не включаются в события аналитики.'] },
      { title: '5. Cookies', paragraphs: ['Мы не используем рекламные cookies. Для проверки Премиум и работы сервиса может применяться только строго необходимое хранилище.'] },
      { title: '6. Сторонние сервисы', paragraphs: ['Dodo Payments и поставщики аналитики применяют собственные политики. Внешние ссылки, включая instagram.com, находятся вне нашего контроля.'] },
      { title: '7. Дети', paragraphs: ['SafeUnfollow не предназначен для детей младше 13 лет, и мы сознательно не собираем их данные.'] },
      { title: '8. Изменения', paragraphs: ['Мы можем обновлять эту политику. Продолжение использования означает принятие новой версии.'] },
      { title: '9. Контакты', paragraphs: ['Вопросы направляйте на privacy@safeunfollow.com.'] },
    ],
  },
  es: {
    title: 'Política de Privacidad', updated: 'Última actualización: agosto de 2026', back: 'Volver al inicio',
    sections: [
      { title: '1. No recopilamos el archivo', paragraphs: ['SafeUnfollow procesa tus datos de Instagram completamente en el navegador. Los archivos y las listas de seguidores y seguidos nunca salen de tu dispositivo.', 'El analizador solo lee los archivos necesarios para relaciones mutuas, unidireccionales y cambios entre instantáneas. No analiza mensajes, publicaciones, fotos, videos, contactos ni otros archivos.'] },
      { title: '2. Almacenamiento local', paragraphs: ['Las instantáneas y los datos procesados se guardan únicamente en localStorage. Puedes eliminarlos borrando los datos del navegador.'] },
      { title: '3. Premium y pagos', paragraphs: ['Si compras Premium, guardamos tu correo solo para verificar el acceso y operar la suscripción. Dodo Payments procesa los pagos; SafeUnfollow no almacena tarjetas ni vende tu correo.'] },
      { title: '4. Analítica', paragraphs: ['Podemos recopilar métricas anónimas y agregadas, como visitas, idioma y eventos del embudo. El contenido del ZIP, usuarios y archivos no se incluyen en esos eventos.'] },
      { title: '5. Cookies', paragraphs: ['No usamos cookies publicitarias. Puede utilizarse almacenamiento estrictamente necesario para verificar Premium y operar el servicio.'] },
      { title: '6. Servicios de terceros', paragraphs: ['Dodo Payments y los proveedores de analítica tienen sus propias políticas. Los enlaces externos, incluido instagram.com, quedan fuera de nuestro control.'] },
      { title: '7. Menores', paragraphs: ['SafeUnfollow no está dirigido a menores de 13 años y no recopilamos conscientemente sus datos.'] },
      { title: '8. Cambios', paragraphs: ['Podemos actualizar esta política. El uso continuado implica aceptar la versión revisada.'] },
      { title: '9. Contacto', paragraphs: ['Envía tus preguntas a privacy@safeunfollow.com.'] },
    ],
  },
};

export const termsContent: Record<Lang, LegalDocument> = {
  en: {
    title: 'Terms of Service', updated: 'Last updated: August 2026', back: 'Back to home',
    sections: [
      { title: '1. Acceptance', paragraphs: ['By using SafeUnfollow (the Service), you agree to these Terms. If you do not agree, do not use the Service.'] },
      { title: '2. Description', paragraphs: ['SafeUnfollow is a client-side Instagram data analyzer for mutual connections, one-way follows, and snapshot changes. It does not access or act on your Instagram account. We are not affiliated with Instagram or Meta Platforms, Inc.'] },
      { title: '3. Permitted Use', paragraphs: ['You may use the Service only for lawful, personal purposes. You must not:'], bullets: ['Violate Instagram terms or applicable law', 'Reverse-engineer, scrape, disrupt, or misuse the Service', 'Harass or harm others', 'Resell or sublicense access'] },
      { title: '4. Premium Subscriptions', paragraphs: ['Dodo Payments processes monthly and annual subscriptions. You may cancel at any time. Cancellation and refund timing are governed by the checkout terms and Dodo Payments policies shown at purchase.'] },
      { title: '5. Disclaimer of Warranties', paragraphs: ['The Service is provided as is. We do not guarantee result accuracy, uninterrupted availability, or fitness for a particular purpose.'] },
      { title: '6. Limitation of Liability', paragraphs: ['To the fullest extent permitted by law, SafeUnfollow and its operators are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Service.'] },
      { title: '7. Intellectual Property', paragraphs: ['Service content, design, and code belong to SafeUnfollow and may not be copied or redistributed without permission.'] },
      { title: '8. Changes', paragraphs: ['We may update these Terms. Continued use after an update constitutes acceptance of the revised Terms.'] },
      { title: '9. Governing Law', paragraphs: ['These Terms are governed by the laws of the jurisdiction in which SafeUnfollow operates, without regard to conflict-of-law provisions.'] },
      { title: '10. Contact', paragraphs: ['Questions may be sent to legal@safeunfollow.com.'] },
    ],
  },
  pt: {
    title: 'Termos de Serviço', updated: 'Última atualização: agosto de 2026', back: 'Voltar ao início',
    sections: [
      { title: '1. Aceitação', paragraphs: ['Ao usar o SafeUnfollow (o Serviço), você concorda com estes Termos. Se não concordar, não use o Serviço.'] },
      { title: '2. Descrição', paragraphs: ['O SafeUnfollow é um analisador local de dados do Instagram para conexões mútuas, relações unilaterais e mudanças entre capturas. Ele não acessa nem realiza ações na sua conta. Não somos afiliados ao Instagram ou à Meta Platforms, Inc.'] },
      { title: '3. Uso permitido', paragraphs: ['Use o Serviço somente para fins pessoais e legais. Você não pode:'], bullets: ['Violar os termos do Instagram ou a legislação', 'Fazer engenharia reversa, scraping, interromper ou usar indevidamente o Serviço', 'Assediar ou prejudicar terceiros', 'Revender ou sublicenciar o acesso'] },
      { title: '4. Assinaturas Premium', paragraphs: ['A Dodo Payments processa assinaturas mensais e anuais. Você pode cancelar a qualquer momento. Prazos de cancelamento e reembolso seguem os termos exibidos no checkout e as políticas da Dodo Payments.'] },
      { title: '5. Isenção de garantias', paragraphs: ['O Serviço é fornecido no estado em que se encontra. Não garantimos precisão, disponibilidade ininterrupta ou adequação a uma finalidade específica.'] },
      { title: '6. Limitação de responsabilidade', paragraphs: ['Na extensão permitida pela lei, o SafeUnfollow e seus operadores não respondem por danos indiretos, incidentais, especiais, consequenciais ou punitivos.'] },
      { title: '7. Propriedade intelectual', paragraphs: ['Conteúdo, design e código pertencem ao SafeUnfollow e não podem ser copiados ou redistribuídos sem permissão.'] },
      { title: '8. Alterações', paragraphs: ['Podemos atualizar estes Termos. O uso contínuo representa aceitação da versão revisada.'] },
      { title: '9. Lei aplicável', paragraphs: ['Estes Termos seguem as leis da jurisdição em que o SafeUnfollow opera.'] },
      { title: '10. Contato', paragraphs: ['Envie dúvidas para legal@safeunfollow.com.'] },
    ],
  },
  ru: {
    title: 'Условия использования', updated: 'Обновлено: август 2026 г.', back: 'На главную',
    sections: [
      { title: '1. Принятие условий', paragraphs: ['Используя SafeUnfollow (Сервис), вы соглашаетесь с этими Условиями. Если вы не согласны, не используйте Сервис.'] },
      { title: '2. Описание', paragraphs: ['SafeUnfollow — локальный анализатор данных Instagram для взаимных и односторонних подписок и изменений снимков. Он не получает доступ к аккаунту и не действует от вашего имени. Мы не связаны с Instagram или Meta Platforms, Inc.'] },
      { title: '3. Допустимое использование', paragraphs: ['Сервис разрешено использовать только в законных личных целях. Запрещено:'], bullets: ['Нарушать условия Instagram или закон', 'Выполнять обратную разработку, scraping, нарушать работу или злоупотреблять Сервисом', 'Преследовать или причинять вред другим', 'Перепродавать доступ'] },
      { title: '4. Подписка Премиум', paragraphs: ['Dodo Payments обрабатывает ежемесячные и годовые подписки. Подписку можно отменить в любое время. Сроки отмены и возврата определяются условиями checkout и политиками Dodo Payments.'] },
      { title: '5. Отказ от гарантий', paragraphs: ['Сервис предоставляется как есть. Мы не гарантируем точность, непрерывную доступность или пригодность для конкретной цели.'] },
      { title: '6. Ограничение ответственности', paragraphs: ['В максимально разрешённой законом степени SafeUnfollow и его операторы не отвечают за косвенные, случайные, специальные, последующие или штрафные убытки.'] },
      { title: '7. Интеллектуальная собственность', paragraphs: ['Контент, дизайн и код принадлежат SafeUnfollow и не могут копироваться или распространяться без разрешения.'] },
      { title: '8. Изменения', paragraphs: ['Мы можем обновлять Условия. Продолжение использования означает принятие новой версии.'] },
      { title: '9. Применимое право', paragraphs: ['Условия регулируются законодательством юрисдикции, в которой работает SafeUnfollow.'] },
      { title: '10. Контакты', paragraphs: ['Вопросы направляйте на legal@safeunfollow.com.'] },
    ],
  },
  es: {
    title: 'Términos del Servicio', updated: 'Última actualización: agosto de 2026', back: 'Volver al inicio',
    sections: [
      { title: '1. Aceptación', paragraphs: ['Al usar SafeUnfollow (el Servicio), aceptas estos Términos. Si no estás de acuerdo, no uses el Servicio.'] },
      { title: '2. Descripción', paragraphs: ['SafeUnfollow es un analizador local de datos de Instagram para relaciones mutuas, unidireccionales y cambios entre instantáneas. No accede ni actúa en tu cuenta. No estamos afiliados con Instagram ni Meta Platforms, Inc.'] },
      { title: '3. Uso permitido', paragraphs: ['Usa el Servicio solo con fines personales y legales. No puedes:'], bullets: ['Infringir los términos de Instagram o la ley', 'Realizar ingeniería inversa, scraping, interrumpir o abusar del Servicio', 'Acosar o perjudicar a terceros', 'Revender o sublicenciar el acceso'] },
      { title: '4. Suscripciones Premium', paragraphs: ['Dodo Payments procesa suscripciones mensuales y anuales. Puedes cancelar cuando quieras. Los plazos de cancelación y reembolso se rigen por los términos del checkout y las políticas de Dodo Payments.'] },
      { title: '5. Exclusión de garantías', paragraphs: ['El Servicio se proporciona tal cual. No garantizamos exactitud, disponibilidad ininterrumpida ni idoneidad para un propósito concreto.'] },
      { title: '6. Limitación de responsabilidad', paragraphs: ['En la medida permitida por la ley, SafeUnfollow y sus operadores no responden por daños indirectos, incidentales, especiales, consecuentes o punitivos.'] },
      { title: '7. Propiedad intelectual', paragraphs: ['El contenido, diseño y código pertenecen a SafeUnfollow y no pueden copiarse ni redistribuirse sin permiso.'] },
      { title: '8. Cambios', paragraphs: ['Podemos actualizar estos Términos. El uso continuado implica aceptar la versión revisada.'] },
      { title: '9. Ley aplicable', paragraphs: ['Estos Términos se rigen por las leyes de la jurisdicción donde opera SafeUnfollow.'] },
      { title: '10. Contacto', paragraphs: ['Envía tus preguntas a legal@safeunfollow.com.'] },
    ],
  },
};
