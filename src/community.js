import {purchaseModes} from './commerce.js?v=20261120-3';
import {icon} from './icons.js';

export function initCommunity(state){
  state.community ??= {
    name:'Бишка', about:'Одежда, аксессуары и услуги для собак. Поможем выбрать всё для прогулок.',
    city:'Москва', address:'Шаболовка', hours:'Ежедневно, 10:00–20:00',
    action:'market', actionLabel:'Открыть витрину', priority:'goods',
    posts:true, clips:true, goods:true, services:true, channel:true, messages:true,
    comments:true, keywords:'', greeting:'Привет! Чем помочь вам и вашему питомцу?',
    links:[], menu:['market','services','clips'], following:true
  };
  state.publications ??= [
    {id:1,type:'clip',title:'Пончо для собак',text:'Проверяем пончо на прогулке после дождя.',product:1,poster:'poncho'},
    {id:2,type:'post',title:'Готовимся к прогулкам под дождём',text:'Лёгкое пончо защищает спину от дождя. Если сомневаетесь с размером, напишите нам.',product:1,poster:'poncho'}
  ];
  state.services ??= [{id:1,name:'Стилист Барбос',text:'Подбор одежды и аксессуаров для вашего питомца.',price:0,photo:true}];
  state.comments ??= [{id:1,publication:2,author:'Покупатель',text:'Подскажите, как выбрать размер?',hidden:false,reply:''}];
  state.messages ??= [];
  state.promos ??= [{code:'BISHKA10',percent:10,active:true}];
  state.reviews ??= [];
  state.activity ??= [];
  state.campaigns ??= [];
  state.cart ??= [];
  state.trials ??= [];
  state.collections ??= [{id:1,name:'На прогулку',products:[1,3]}];
}
export function safeUrl(value){
  try {
    const url = new URL(value);
    return ['https:','http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
const avatar = '<img class="community-avatar" src="./public/media/community-avatar.webp" alt="">';
const sections = {
  profile:'Основная информация', action:'Кнопка действия', visibility:'Контент и разделы',
  links:'Ссылки и адреса', menu:'Меню', contact:'Сообщения', comments:'Комментарии',
  log:'Журнал действий', other:'Другие инструменты'
};
const targets = {market:'Товары',services:'Услуги',clips:'Клипы',inbox:'Написать',community:'Сообщество'};
const types = {post:'Пост',clip:'Клип',channel:'Публикация в канале'};
const other = ['Подписчики','Руководители','Приглашения','Чёрный список','Чаты','Приложения','Файлы','Контакты','Моменты','Статьи','Видео','Истории','Страйки','Верификация','Работа с API','VK Донат','Партнёрская программа','Маркет-платформа','Монетизация видео','VK AdBlogger','Фонд авторов VK','Кабинет выплат'];
const nextId = list => Math.max(0,...list.map(row=>row.id))+1;

export function communityUI(state, ui){
  const {esc,link,btn,money,badge,dialog,save,go,productImage,table,roleSwitch}=ui;
  const c=state.community;
  const subscribers=['Алина','Миша','Анна','Мария','Алексей','Виктория'];
  const card=(title,body,action='')=>`<section class="card"><div class="card-head"><h2>${title}</h2>${action}</div>${body}</section>`;
  const input=(name,label,value='',attrs='')=>`<label>${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
  const area=(name,label,value='',attrs='')=>`<label>${label}<textarea name="${name}" rows="3" maxlength="900" ${attrs}>${esc(value)}</textarea></label>`;
  const toggle=(name,label,checked)=>`<label class="toggle-row"><span>${label}</span><input type="checkbox" name="${name}" ${checked?'checked':''}></label>`;
  const select=(name,label,options,value)=>`<label>${label}<select name="${name}">${Object.entries(options).map(([k,v])=>`<option value="${k}" ${String(value)===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
  const form=(name,body,label='Сохранить',id='')=>`<form data-form="community-${name}" data-id="${id}">${body}<button class="btn primary">${label}</button></form>`;
  const listNav=(items,active)=>`<nav class="local-nav" aria-label="Разделы сообщества">${Object.entries(items).map(([url,label])=>`<a href="#${url}" ${url===active?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
  const publicTarget=url=>({inbox:'inbox/shop',services:'shop-services',market:'market-shop'})[url]||url;
  const blank=message=>`<p class="empty-note">${message}</p>`;
  const visible = p => p.type==='clip'?c.clips:p.type==='channel'?c.channel:c.posts;
  const productAction=(p,source,label='Открыть товар',publication=0)=>btn('open-product',label,'secondary',`${p.id}:${source}:${publication}`);

  function productTag(product,source,publication){
    const id=`${product.id}:${source}:${publication}`;
    const modes=purchaseModes(product);
    const messageOnly=modes.length===1&&modes[0]==='message'&&c.messages;
    return `<button type="button" class="media-product-tag" data-action="${messageOnly?'product-message':'open-product'}" data-id="${id}" aria-label="${messageOnly?'Написать продавцу: ':'Открыть товар: '}${esc(product.name)}">
      ${productImage(product)}<span class="media-product-name"><strong>${esc(product.name)}</strong><small>${money(product.price)}</small></span>
      <span class="media-product-cta">${messageOnly?'Написать':'К товару'} ${icon('arrow',15)}</span>
    </button>`;
  }

  function publication(p,full=false){
    const source=p.type==='clip'?0:1;
    const product=state.products.find(row=>row.id===p.product);
    const tag=product?productTag(product,source,p.id):'';
    const clip=p.type==='clip'?link('clips/'+p.id,icon('play',18)+' Смотреть клип','btn secondary'):'';
    const media=p.poster==='poncho'?`<div class="publication-media">
      <img class="publication-photo" src="./public/media/poncho.webp" alt="Собака в синем пончо">
      ${tag?`<div class="publication-media-tag">${tag}</div>`:''}
    </div>`:tag;
    return `<article class="publication"><header class="community-item">${link('community',avatar+'<span><strong>'+esc(c.name)+'</strong><small>'+types[p.type]+'</small></span>','community-item')}</header>
      <h3>${esc(p.title)}</h3><p class="preline">${esc(p.text)}</p>
      ${media}${clip}${full&&c.comments?commentsFor(p.id):''}</article>`;
  }
  function commentsFor(id){
    const rows=state.comments.filter(item=>item.publication===id&&!item.hidden);
    return `<div class="publication-comments">${rows.map(row=>`<p><strong>${esc(row.author)}</strong> · ${esc(row.text)}</p>${row.reply?`<p class="reply"><strong>${esc(c.name)}</strong> · ${esc(row.reply)}</p>`:''}`).join('')}${form('comment',area('text','Комментарий','','required'),'Отправить комментарий',id)}</div>`;
  }
  function home(tab,owner){
    const path='community/'+(owner?'owner':'buyer');
    const goodsPath=owner?'products':'market-shop';
    const filters={all:'Главная',post:'Посты',clip:'Клипы',channel:'Канал'};
    const published=state.publications.filter(p=>visible(p)&&(tab==='all'||p.type===tab));
    const shelves=[
      ['goods',c.goods,()=>card('Товары',`<div class="community-shelf">${state.products.filter(p=>(p.sellerId||'bishka')==='bishka').slice(0,3).map(p=>`<div class="shelf-item">${productImage(p)}<strong>${money(p.price)}</strong><span>${esc(p.name)}</span>${productAction(p,5)}</div>`).join('')}</div>`,link(goodsPath,'Все товары','text-link'))],
      ['services',c.services,()=>card('Услуги',state.services.length?serviceRow(state.services[0],false):blank('Пока нет услуг'),link('shop-services','Все услуги','text-link'))]
    ].filter(([,enabled])=>enabled).sort(([a],[b])=>Number(b===c.priority)-Number(a===c.priority));
    const action=c.action==='inbox'&&(owner||!c.messages)?'':c.action!=='none'?link(publicTarget(c.action),esc(c.actionLabel),'btn primary'):'';
    return `<section class="card community-hero"><div class="community-cover"></div>
      <div class="community-identity">${avatar}<div><h1>${esc(c.name)}</h1><p class="muted">Товары и услуги для собак</p></div>
      <div class="actions">${action}${btn('community-follow',c.following?'Вы подписаны':'Подписаться')}${!owner&&c.messages&&c.action!=='inbox'?link('inbox/shop','Написать продавцу','btn secondary'):''}</div></div>
      ${roleSwitch('community',owner)}
      <nav class="tabs community-tabs" aria-label="Страница сообщества">${Object.entries(filters).filter(([key])=>({all:true,post:c.posts,clip:c.clips,channel:c.channel}[key])).map(([key,label])=>`<a href="#${path}/${key}" ${key===tab?'aria-current="page"':''}>${label}</a>`).join('')}${owner?link(goodsPath,'Товары'):''}</nav></section>
      ${owner?card('Управление сообществом',`<div class="actions">
        ${link('business','Мой бизнес','btn primary')}${btn('community-compose','Создать публикацию')}
        ${link('new-community/owner','Обучение запуску магазина','btn secondary')}
      </div>`):''}
      <div class="community-columns community-home"><div class="community-stack">
        ${tab==='all'?shelves.map(([, ,draw])=>draw()).join(''):''}
        ${card(filters[tab]==='Главная'?'Публикации':filters[tab],published.length?published.map(p=>publication(p,true)).join(''):blank('Здесь пока нет публикаций.'))}
      </div><aside class="community-stack">${card('О сообществе',`<p class="preline">${esc(c.about)}</p><p class="muted">${[c.address,c.city].filter(Boolean).map(esc).join(', ')}</p><p class="muted">${esc(c.hours)}</p>${c.links.map(l=>`<a class="text-link" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.name)}</a>`).join('')}`)}
      ${card('Подписчики <span class="muted">'+(129+Number(c.following))+'</span>',`<div class="community-subscribers">${subscribers.slice(0,4).map((name,i)=>`<span><i class="chat-avatar ${i%2?'orange':'blue'}" aria-hidden="true">${name[0]}</i><small>${name}</small></span>`).join('')}</div>`,btn('community-subscribers','Показать','secondary'))}
      ${card('Быстрые ссылки',listNav(Object.fromEntries(c.menu.filter(url=>url!=='inbox'||(!owner&&c.messages)).map(url=>[url==='market'?goodsPath:publicTarget(url),targets[url]]).concat([['cart','Корзина'],['my-orders','Мои заказы']])),''))}</aside></div>`;
  }
  function clipPage(clipId){
    const clips=state.publications.filter(p=>p.type==='clip'&&visible(p));
    // Keep the playable demonstration first when opening the Clips section.
    const clip=clips.find(p=>p.id===Number(clipId))||clips.find(p=>p.id===1)||clips[0];
    if(!clip)return card('VK Клипы',blank('Клипы пока не опубликованы.'));

    const product=state.products.find(p=>p.id===clip.product);
    const demoVideo=clip.id===1||clip.video==='poncho';
    const player=demoVideo
      ? '<video class="clip-player" data-publication="'+clip.id+'" src="./public/media/poncho-clip.mp4" poster="./public/media/poncho.webp" aria-label="Деморолик о пончо Бишки" controls muted autoplay loop playsinline preload="metadata">Ваш браузер не поддерживает видео.</video>'
      : '<div class="clip-no-video"><span>У этого клипа пока нет видео</span></div>';
    const attachment=product?`<div class="clip-media-tag" aria-label="Товар из клипа">${productTag(product,0,clip.id)}</div>`:'';
    const more=clips.length>1?`<nav class="clip-more" aria-label="Другие клипы">${clips.filter(p=>p.id!==clip.id).map(p=>link('clips/'+p.id,esc(p.title),'btn secondary')).join('')}</nav>`:'';
    return `<section class="card clips-screen">
      <header class="clip-toolbar"><h1>VK Клипы</h1>${link('community',esc(c.name),'text-link')}</header>
      <article class="clip-reel">
        <div class="clip-frame">
          ${player}
          ${attachment}
        </div>
        <div class="clip-caption"><strong>${esc(clip.title)}</strong><p class="preline muted">${esc(clip.text)}</p></div>
        ${more}
      </article>
    </section>`;
  }
  function manage(tab){
    const screens=Object.fromEntries(Object.entries(sections).map(([k,v])=>['manage/'+k,v]));
    const bodies={
      profile:form('profile',input('name','Название',c.name,'required maxlength="70"')+area('about','Описание',c.about)),
      action:form('action',select('action','Тип действия',{none:'Скрыть кнопку',...targets},c.action)+input('actionLabel','Текст кнопки',c.actionLabel,'required maxlength="40"')),
      visibility:form('visibility',select('priority','Приоритетный блок',{goods:'Товары',services:'Услуги'},c.priority)+Object.entries({posts:'Посты',clips:'Клипы',goods:'Товары',services:'Услуги',channel:'Канал'}).map(([k,v])=>toggle(k,v,c[k])).join(''))+
        `<p class="muted space-top">Видео · Фото · Музыка · Обсуждения · Файлы · Материалы · Мероприятия</p>`,
      links:form('address',input('city','Город',c.city,'maxlength="50"')+input('address','Адрес',c.address,'maxlength="120"')+input('hours','Время работы',c.hours,'maxlength="80"'))+
        `<hr><h3>Ссылки сообщества</h3>${c.links.map((l,i)=>`<div class="community-item"><span>${esc(l.name)}</span>${btn('community-remove-link','Убрать ссылку','secondary',i)}</div>`).join('')}${form('link',input('name','Название ссылки','','required maxlength="50"')+input('url','Адрес ссылки','','required type="url"'),'Добавить ссылку')}`,
      menu:form('menu',Object.entries(targets).filter(([k])=>k!=='community').map(([k,v])=>toggle(k,v,c.menu.includes(k))).join('')),
      contact:form('contact',toggle('messages','Сообщения сообщества',c.messages)+area('greeting','Приветствие',c.greeting)),
      comments:form('comment-settings',toggle('comments','Разрешить комментарии',c.comments)+input('keywords','Фильтр по словам через запятую',c.keywords,'maxlength="240"'))+link('comments','Открыть список комментариев','text-link space-top'),
      log:state.activity.length?table(['Действие','Время'],state.activity.map(e=>[esc(e.text),new Date(e.at).toLocaleString('ru-RU')])):blank('Новые изменения появятся здесь.'),
      other:`<p class="muted">Эти разделы показаны для навигации по возможностям ВКонтакте. В локальном демо они недоступны.</p><div class="disabled-grid">${other.map(name=>`<span aria-disabled="true">${name}</span>`).join('')}</div>`
    };
    return `<div class="community-columns">${card(sections[tab],bodies[tab])}<aside>${card('Управление',listNav(screens,'manage/'+tab))}</aside></div>`;
  }
  function moderation(tab){
    const filtered=tab==='hidden';
    const rows=state.comments.filter(row=>row.hidden===filtered);
    const filters=listNav({'comments/all':'Все комментарии','comments/hidden':'Скрытые'},'comments/'+tab);
    return card('Комментарии сообщества',filters+(rows.length?rows.map(row=>`<article class="message-row"><strong>${esc(row.author)}</strong><small>${esc(state.publications.find(p=>p.id===row.publication)?.title||'Публикация')}</small><p>${esc(row.text)}</p>${row.reply?`<p class="reply">Ответ: ${esc(row.reply)}</p>`:''}<div class="actions">${btn('community-moderate',row.hidden?'Восстановить':'Скрыть','secondary',row.id)}${!row.hidden?btn('community-reply','Ответить','secondary',row.id):''}</div></article>`).join(''):blank('В этом списке пока нет комментариев.')),link('manage/comments','Настроить фильтр','text-link'));
  }
  function serviceRow(s,manage){
    return `<article class="service-row">${s.photo?'<img src="./public/media/stylist.webp" alt="Собака в одежде от стилиста">':''}
      <div><h3>${esc(s.name)}</h3><p class="preline muted">${esc(s.text)}</p><strong>${s.price?money(s.price):'По договорённости'}</strong>
      <div class="actions">${manage?btn('community-service-edit','Изменить','secondary',s.id):''}${!manage&&c.messages?btn('community-service-request','Заказать услугу','secondary',s.id):''}</div></div></article>`;
  }
  function services(){
    return card('Услуги сообщества',state.services.length?state.services.map(s=>serviceRow(s,true)).join(''):blank('Добавьте первую услугу.'),btn('community-service-edit','Добавить услугу','primary'));
  }
  function publicServices(){
    return card('Услуги «'+esc(c.name)+'»',c.services&&state.services.length?state.services.map(s=>serviceRow(s,false)).join(''):blank('Услуг пока нет.'));
  }
  function promos(){
    return card('Промокоды',table(['Код','Скидка на товары','Статус',''],state.promos.map((pr,i)=>[esc(pr.code),pr.percent+'%',badge(pr.active?'Активен':'В архиве',pr.active?'green':''),btn('community-promo-toggle',pr.active?'В архив':'Активировать','secondary',i)])),btn('community-promo','Создать промокод','primary'));
  }
  function campaigns(){
    const body=state.campaigns.map(row=>[esc(row.title),esc(row.goal),money(row.daily*row.days),badge('Черновик'),btn('community-campaign','Открыть','secondary',row.id)]);
    return card('Продвижение сообщества',`<p class="muted">Подготовьте объявление, выберите аудиторию и оцените бюджет. Кампания сохраняется как локальный черновик.</p>${table(['Объявление','Цель','Бюджет','Статус',''],body,'Черновиков пока нет.')}`,btn('community-campaign','Создать черновик','primary'));
  }
  function integrations(){
    return card('Интеграции',`<div class="message-row"><h3>Ozon</h3><p class="muted">В карточке товара можно указать ссылку на конкретный товар Ozon и подписать источник отзывов.</p>${link('products','Настроить карточку','btn secondary')}</div>
      ${['Моё время','YCLIENTS','VK Бустер','Авито'].map(name=>`<div class="message-row community-item"><strong>${name}</strong>${badge('Вне демо')}</div>`).join('')}`);
  }
  function help(){
    const questions=[
      ['Как проверить готовность магазина?','В обзоре есть список обязательных шагов. Из карточки товара можно открыть проверку без создания заказа.','business'],
      ['Как узнать, какой клип принёс заказ?','Откройте «Контент и каналы» и выберите VK Клипы. Карточка заказа также содержит источник.','content/0'],
      ['Где настроить доставку и скидку?','Выберите способы доставки в настройках магазина. Промокод применяется к товарам в корзине.','settings'],
      ['Как обработать отмену или оплату?','Откройте карточку заказа в кабинете. Статус оплаты отображается отдельно от выполнения.','orders']
    ];
    return card('Справка',questions.map(([q,a,to])=>`<details class="help-item"><summary>${q}</summary><p>${a}</p>${link(to,'Открыть раздел','text-link')}</details>`).join(''));
  }
  function feed(){
    const posts=state.publications.filter(p=>p.type==='post'&&visible(p));
    return card('Лента',posts.length?posts.map(p=>publication(p,true)).join(''):blank('В ленте пока нет постов.'));
  }
  function shops(){
    return state.collections.map(collection=>{
      const products=collection.products.map(id=>state.products.find(p=>p.id===id)).filter(p=>p?.stock>0);
      return card(esc(collection.name),products.length?'<div class="community-shelf">'+products.map(p=>'<div class="shelf-item">'+productImage(p)+'<strong>'+money(p.price)+'</strong><span>'+esc(p.name)+'</span>'+productAction(p,2)+'</div>').join('')+'</div>':blank('В подборке пока нет доступных товаров.'));
    }).join('')||card('Подборки',blank('В магазине пока нет подборок.'));
  }
  function collections(){
    return card('Подборки магазина',table(['Название','Товары',''],state.collections.map(row=>[
      esc(row.name),row.products.map(id=>esc(state.products.find(p=>p.id===id)?.name||'')).filter(Boolean).join(', '),
      btn('community-collection','Изменить','secondary',row.id)
    ]),'Создайте подборку, чтобы показать товары вместе.')+link('shops','Посмотреть подборки как покупатель','btn secondary space-top'),btn('community-collection','Создать подборку','primary'));
  }
  const views={feed,shops,collections,community:(role,detail)=>{
      const tab=detail||role;
      return home(['post','clip','channel'].includes(tab)?tab:'all',role==='owner');
    },clips:clipPage,
    manage:arg=>manage(Object.hasOwn(sections,arg)?arg:'profile'),comments:arg=>moderation(arg==='hidden'?'hidden':'all'),
    'shop-services':publicServices,services,promos,campaigns,integrations,help};

  function change(message){
    state.activity.unshift({text:message,at:Date.now()});
    state.activity=state.activity.slice(0,100);
    save(message);
  }
  function action(name,id){
    const index=Number(id);
    switch(name){
      case 'follow': c.following=!c.following;save(c.following?'Вы подписаны':'Подписка отменена');break;
      case 'remove-link': c.links.splice(index,1);change('Ссылка убрана из сообщества');break;
      case 'subscribers':
        dialog('Подписчики',`<div class="community-subscribers">${subscribers.map(name=>`<span><i class="chat-avatar" aria-hidden="true">${name[0]}</i><small>${name}</small></span>`).join('')}</div><p class="muted">Пример списка подписчиков в демо.</p>`);
        break;
      case 'compose':
        dialog('Новая публикация',`<form data-form="community-publish" class="publication-composer">
          <div class="community-item">${avatar}<strong>${esc(c.name)}</strong></div>
          <div class="field-grid">${select('type','Формат',types,'post')}${input('title','Заголовок','','required maxlength="70" placeholder="О чём публикация?"')}</div>
          ${area('text','Текст публикации','','required placeholder="Расскажите, зачем пригодится товар или как им пользоваться"')}
          ${select('product','Товар в публикации',Object.fromEntries([['0','Без товара'],...state.products.map(p=>[p.id,p.name])]),0)}
          <div class="composer-preview" hidden></div>
          <label data-clip-choice hidden>Видео<select name="video" disabled><option value="">Выберите видео</option><option value="poncho">Деморолик: пончо на прогулке</option></select></label>
          <div class="actions"><button class="btn primary">Опубликовать</button></div>
        </form>`);
        break;
      case 'moderate': {
        const comment=state.comments.find(row=>row.id===index);
        if(!comment)break;
        comment.hidden=!comment.hidden;
        change(comment.hidden?'Комментарий скрыт':'Комментарий восстановлен');
        break;
      }
      case 'reply': {
        const row=state.comments.find(row=>row.id===index);
        if(row)dialog('Ответ от сообщества',form('reply',area('text','Ответ',row.reply,'required'),'Ответить',index));
        break;
      }
      case 'service-edit': {
        const row=state.services.find(row=>row.id===index);
        dialog(row?'Изменить услугу':'Добавить услугу',form('service',
          input('name','Название',row?.name,'required maxlength="70"')+area('text','Описание',row?.text)+
          input('price','Цена, ₽ (0 — по договорённости)',row?.price??0,'type="number" min="0" max="1000000" required'),'Сохранить услугу',row?.id||0));
        break;
      }
      case 'service-request': {
        const row=state.services.find(row=>row.id===index);
        if(row&&c.messages)dialog('Вопрос об услуге',form('service-request',area('text','Сообщение','Здравствуйте! Расскажите подробнее об услуге «'+row.name+'».','required'),'Задать вопрос',index));
        break;
      }
      case 'promo':
        dialog('Создать промокод',form('promo',input('code','Код','','required minlength="3" maxlength="24"')+input('percent','Скидка, %',10,'required type="number" min="1" max="90"'),'Создать'));
        break;
      case 'promo-toggle':
        if(state.promos[index]){
          state.promos[index].active=!state.promos[index].active;
          change('Статус промокода изменён');
        }
        break;
      case 'collection': {
        const row=state.collections.find(row=>row.id===index);
        dialog(row?'Изменить подборку':'Создать подборку',form('collection',
          input('name','Название подборки',row?.name,'required maxlength="70"')+
          state.products.map(p=>toggle('product-'+p.id,esc(p.name),row?.products.includes(p.id))).join(''),
          'Сохранить подборку',row?.id||0));
        break;
      }
      case 'campaign': {
        const row=state.campaigns.find(row=>row.id===index);
        dialog('Черновик продвижения',form('campaign',
          input('title','Название',row?.title,'required maxlength="70"')+
          select('goal','Цель',{'Продать товар':'Продать товар','Получить сообщения':'Получить сообщения','Продвигать контент':'Продвигать контент'},row?.goal)+
          input('city','Аудитория: город',row?.city||c.city,'required maxlength="70"')+
          input('daily','Бюджет в день, ₽',row?.daily??650,'required type="number" min="1" max="1000000"')+
          input('days','Длительность, дней',row?.days??7,'required type="number" min="1" max="90"')+
          '<p class="muted">Объявление останется черновиком. Публикация и списание в демо недоступны.</p>','Сохранить черновик',row?.id||0));
        break;
      }
    }
  }
  function submit(name,formNode){
    const data=new FormData(formNode);
    const value=key=>String(data.get(key)||'').trim();
    const id=Number(formNode.dataset.id);
    let message='Настройки сообщества сохранены';
    switch(name){
      case 'profile': if(!value('name'))return;Object.assign(c,{name:value('name'),about:value('about')});break;
      case 'action': if(!value('actionLabel'))return;Object.assign(c,{action:value('action'),actionLabel:value('actionLabel')});break;
      case 'visibility':
        c.priority=value('priority');
        for(const field of ['posts','clips','goods','services','channel'])c[field]=data.has(field);
        break;
      case 'address': for(const field of ['city','address','hours'])c[field]=value(field);break;
      case 'link': {
        const url=safeUrl(value('url'));
        if(!url||!value('name'))return invalid(formNode,'url','Укажите адрес с https:// или http://.');
        c.links.push({url,name:value('name')});message='Ссылка добавлена';
        break;
      }
      case 'menu': c.menu=Object.keys(targets).filter(key=>data.has(key));break;
      case 'contact': Object.assign(c,{messages:data.has('messages'),greeting:value('greeting')});break;
      case 'comment-settings': Object.assign(c,{comments:data.has('comments'),keywords:value('keywords')});break;
      case 'comment': {
        if(!c.comments||!value('text'))return;
        const hidden=c.keywords.toLowerCase().split(',').map(k=>k.trim()).filter(Boolean).some(k=>value('text').toLowerCase().includes(k));
        state.comments.push({id:nextId(state.comments),publication:id,author:'Покупатель',text:value('text'),hidden,reply:''});
        message=hidden?'Комментарий скрыт фильтром':'Комментарий добавлен';
        break;
      }
      case 'reply': {
        const row=state.comments.find(row=>row.id===id);
        if(!row||!value('text'))return;
        row.reply=value('text');message='Ответ опубликован';
        break;
      }
      case 'publish': {
        if(!value('title')||!value('text'))return;
        const type=value('type');
        state.publications.unshift({id:nextId(state.publications),type,title:value('title'),text:value('text'),product:+value('product'),poster:state.products.find(p=>p.id===+value('product'))?.kind==='poncho'?'poncho':'',video:type==='clip'?value('video'):''});
        if(type==='clip')c.clips=true;
        if(type==='post')c.posts=true;
        if(type==='channel')c.channel=true;
        message='Публикация добавлена';
        go('community/owner/'+type);
        break;
      }
      case 'message':
      case 'service-request': {
        const [thread,side]=formNode.dataset.id.split(':');
        const seller=side==='seller';
        const service=name==='service-request';
        const threadId=service?0:Number(thread);
        if(!value('text')||(!seller&&!c.messages))return;
        if(threadId!==0&&!state.orders.some(order=>order.id===threadId&&(seller||order.demo)))return;
        state.messages.push({thread:threadId,side:seller?'seller':'buyer',text:value('text'),at:Date.now()});
        if(!seller)go(threadId?'inbox/order/'+threadId:'inbox/shop');
        save('Сообщение отправлено');
        return;
      }
      case 'service': {
        if(!value('name'))return;
        const changes={name:value('name'),text:value('text'),price:+value('price')};
        const row=state.services.find(row=>row.id===id);
        if(row)Object.assign(row,changes);
        else state.services.push({id:nextId(state.services),...changes});
        message='Услуга сохранена';
        break;
      }
      case 'promo': {
        const code=value('code').toUpperCase();
        if(!/^[A-Z0-9_-]{3,24}$/.test(code))return invalid(formNode,'code','Используйте латинские буквы, цифры, дефис или подчёркивание.');
        if(state.promos.some(row=>row.code===code))return invalid(formNode,'code','Такой промокод уже есть.');
        state.promos.push({code,percent:+value('percent'),active:true});
        message='Промокод создан';
        break;
      }
      case 'collection': {
        if(!value('name'))return;
        const changes={name:value('name'),products:state.products.filter(p=>data.has('product-'+p.id)).map(p=>p.id)};
        const row=state.collections.find(row=>row.id===id);
        if(row)Object.assign(row,changes);
        else state.collections.push({id:nextId(state.collections),...changes});
        message='Подборка сохранена';
        break;
      }
      case 'campaign': {
        if(!value('title')||!value('city'))return;
        const changes={title:value('title'),goal:value('goal'),city:value('city'),daily:+value('daily'),days:+value('days')};
        const row=state.campaigns.find(row=>row.id===id);
        if(row)Object.assign(row,changes);
        else state.campaigns.unshift({id:nextId(state.campaigns),...changes});
        message='Черновик сохранён';
        break;
      }
    }
    change(message);
  }
  return {views,action,submit};
}
function invalid(form,name,message){
  const field=form.elements[name];
  field.setCustomValidity(message);
  field.reportValidity();
  field.addEventListener('input',()=>field.setCustomValidity(''),{once:true});
}
