import {icon} from './icons.js';
import {deliveryMethods, marketMatch, quote} from './commerce.js?v=20261120-3';
import {placeOrder, metrics} from './store.js?v=20261120-3';
import {changeDelivery,deliveryStages,deliveryStep} from './delivery.js?v=20261120-3';

const ownerPath='new-community/owner';
const buyerPath='new-community/buyer';
const checkoutPath=buyerPath+'/checkout';
const examples={
  setup:['products','Товары'],
  payments:['settings','Оплата и доставка'],
  promotion:['content','Контент и каналы'],
  operations:['orders','Заказы']
};
const coach=(control,note)=>`<span class="lesson-anchor" data-lesson-note="${note}">${control}</span>`;
const initialDraft=()=>({
  name:'Новое сообщество',description:'',product:null,payment:null,delivery:null,
  publication:null,found:false,orders:[],messages:[],extraProducts:[],report:false
});

export function onboardingUI(state,{esc,money,link,save,go,btn,dialog,closeDialog}){
  const draft=Object.assign(initialDraft(),state.newCommunity);
  state.newCommunity=draft;
  delete draft.checked;
  const order=()=>draft.orders[0];
  if(draft.payment?.mode==='message')draft.payment.mode='vk';
  const chat=()=>false;
  const source=()=>draft.publication?.format==='clip'?'VK Клипы':'Лента';
  const canPublish=()=>draft.description&&draft.product?.category&&draft.payment?.connected&&draft.delivery;
  const ready=()=>canPublish()&&draft.publication&&draft.found;

  function chapters(){
    return [
      {id:'setup',title:'Витрина',steps:[
        ['profile','Оформить сообщество','Заполните название и описание, которое увидит покупатель.',!!draft.description],
        ['product','Опубликовать карточку товара','Подберите категорию, добавьте описание, цену и остаток.',!!draft.product?.category]
      ]},
      {id:'payments',title:'Оплата и доставка',steps:[
        ['payment','Выбрать способ покупки','Посмотрите, где покупатель оформит заказ и что увидит продавец.',!!draft.payment?.mode],
        ['recipient',chat()?'Подготовить первый ответ':'Указать получателя платежей',chat()?'Сохраните шаблон ответа покупателю.':'Укажите имя получателя для тестовой оплаты.',!!draft.payment?.recipient],
        ['connect',chat()?'Включить сообщения':'Подключить VK Pay в демо',chat()?'Разрешите обращения в сообщество.':'Проверьте получателя и включите тестовую оплату.',!!draft.payment?.connected],
        ['delivery','Настроить получение','Укажите стоимость и срок доставки или адрес самовывоза.',!!draft.delivery]
      ]},
      {id:'promotion',title:'Первые покупатели',steps:[
        ['publish','Прикрепить товар к публикации','Сделайте пост или клип с переходом на карточку товара.',!!draft.publication],
        ['visibility','Найти товар в Маркете','Проверьте, по каким запросам покупатель найдёт карточку.',draft.found]
      ]},
      {id:'operations',title:'Заказы и статистика',steps:[
        ['preview',chat()?'Отправить пробное обращение':'Оформить и оплатить пробный заказ','Откройте витрину глазами покупателя и пройдите путь из публикации.',order()?.payment==='paid'||!!draft.inquiry],
        ['fulfill',chat()?'Ответить покупателю':'Обработать заказ','Проверьте оплату, измените статус и посмотрите, что увидит покупатель.',order()?.status==='received'||!!draft.inquiry?.reply],
        ['report','Проверить результат','Найдите источник в сводке и посмотрите, какая сумма оплачена.',draft.report]
      ]}
    ];
  }

  function roleSwitch(path,owner){
    return `<nav class="role-switch" aria-label="Режим просмотра сообщества">
      <a href="#${path}/owner" ${owner?'aria-current="page"':''}>Вид продавца</a>
      <a href="#${path}/buyer" ${owner?'':'aria-current="page"'}>Вид покупателя</a>
    </nav>`;
  }

  function list(){
    const steps=chapters().flatMap(group=>group.steps);
    const done=steps.filter(row=>row[3]).length;
    return `<section class="card"><div class="card-head"><h1>Сообщества</h1></div>
      <div class="community-directory">
        ${link('community','<img class="shop-avatar" src="./public/media/community-avatar.webp" alt=""><span><strong>'+esc(state.community.name)+'</strong><small>Витрина с товарами и публикациями</small></span>'+icon('arrow',17),'community-directory-row')}
        ${link(ownerPath,'<span class="community-new-icon">'+icon('bag',24)+'</span><span><strong>'+esc(draft.name)+'</strong><small>Запуск магазина · '+done+' из '+steps.length+'</small></span>'+icon('arrow',17),'community-directory-row')}
      </div>
    </section>`;
  }

  function currentChapter(groups,step){
    return groups.find(group=>group.id===step||group.steps.some(row=>row[0]===step))
      ||groups.find(group=>group.steps.some(row=>!row[3]))||groups.at(-1);
  }

  function journey(groups,selected){
    const icons=['bag','card','play','check'];
    const steps=groups.flatMap(group=>group.steps);
    const done=steps.filter(row=>row[3]).length;
    return `<section class="card lesson-journey" aria-labelledby="lesson-journey-title">
      <div class="card-head">
        <div><h2 id="lesson-journey-title">Как запустить магазин</h2><p class="muted">${done} из ${steps.length} шагов выполнено</p></div>
        <button class="lesson-toggle btn secondary" type="button" data-lesson-toggle aria-pressed="true">${icon('spark',18)} Подсказки</button>
      </div>
      <nav class="lesson-stages" aria-label="Этапы обучения">${groups.map((group,i)=>{
        const count=group.steps.filter(row=>row[3]).length;
        const complete=count===group.steps.length;
        return `<a class="lesson-stage ${complete?'lesson-stage-done':''}" href="#${ownerPath}/${group.id}" ${group===selected?'aria-current="step"':''}>
          <span class="lesson-stage-icon">${icon(icons[i],19)}</span><strong>${group.title}</strong>
          <span class="lesson-stage-progress"><progress value="${count}" max="${group.steps.length}" aria-label="Выполнено шагов: ${group.title}"></progress><small>${count}/${group.steps.length}</small></span>
        </a>`;
      }).join('')}</nav>
    </section>`;
  }

  function guide(step,groups,selected){
    const steps=groups.flatMap(group=>group.steps);
    const next=steps.find(row=>!row[3]);
    const chapterNext=selected.steps.find(row=>!row[3])||selected.steps[0];
    const lessonOpen=selected.steps.some(row=>row[0]===step&&step!=='preview');
    const [examplePath,exampleLabel]=examples[selected.id];
    return `<section class="card launch-guide">
      <header class="launch-heading"><span class="launch-heading-icon">${icon('bag',22)}</span><div><h2>${selected.title}</h2><p class="muted">${next?'Следующий шаг · '+next[1]:'Вы прошли обучение'}</p></div></header>
      <ol class="launch-list">${selected.steps.map(([id,title,hint,complete])=>{
        const opened=id===step&&id!=='preview';
        const isNext=id===next?.[0]||!lessonOpen&&!!next&&id===chapterNext[0];
        const href=id==='preview'?buyerPath+'/posts':ownerPath+'/'+id;
        const control=link(opened?ownerPath+'/'+selected.id:href,opened?'Свернуть':id==='preview'?'Попробовать':'Открыть','btn '+(isNext&&!opened?'primary':'secondary'));
        const annotated=isNext&&!lessonOpen;
        return `<li class="${isNext?'launch-current':''}" ${isNext?'aria-current="step"':''}>
          <span class="launch-step-icon ${complete?'done':''}" aria-hidden="true">${complete?icon('check',15):steps.findIndex(row=>row[0]===id)+1}</span>
          <div><strong>${title}</strong><small>${hint}</small>${complete?'<span class="sr-only">Выполнено</span>':''}</div>
          ${annotated?coach(control,id==='preview'?'Откройте публикацию как покупатель.':'Откройте следующий шаг обучения.'):control}
          ${opened?lesson(id):''}
        </li>`;
      }).join('')}</ol>
      ${!next?'<p class="training-success">Вы настроили витрину и провели заказ от публикации до получения.</p>':''}
      <div class="launch-footer">
        ${link(examplePath,'«Мой бизнес → '+exampleLabel+'» на примере Бишки','text-link')}
        ${btn('training-reset','Сбросить демо','secondary')}
      </div>
    </section>`;
  }

  const input=(name,label,value='',extra='')=>`<label>${label}<input name="${name}" value="${esc(value)}" required ${extra}></label>`;
  const area=(name,label,value='')=>`<label>${label}<textarea name="${name}" rows="2" maxlength="500" required>${esc(value)}</textarea></label>`;
  const select=(name,label,options,value)=>`<label>${label}<select name="${name}">${Object.entries(options).map(([id,text])=>
    `<option value="${id}" ${value===id?'selected':''}>${text}</option>`
  ).join('')}</select></label>`;
  const form=(step,fields,label='Сохранить')=>`<form class="launch-step-form" data-form="onboarding" data-id="${step}">${fields}<button class="btn primary">${label}</button></form>`;
  const prerequisite=(text,step)=>`<div class="launch-step-form"><p>${text}</p>${coach(link(ownerPath+'/'+step,'Открыть шаг','btn secondary'),'Откройте этот шаг, чтобы заполнить недостающие настройки.')}</div>`;
  const statusLabel=current=>({unpaid:'Не оплачено',processing:'Оплата обрабатывается',paid:'Оплачено',failed:'Оплата не прошла'})[current.payment];
  const settings=()=>({
    payment:draft.payment?.connected,delivery:!!draft.delivery,deliveryMethods:[draft.delivery?.method],
    price:draft.delivery?.fee,days:draft.delivery?.days
  });

  function productFields(product){
    return input('product','Название товара',product?.name,'maxlength="70"')+
      area('description','Описание товара',product?.description)+btn('smart-fill','✦ Заполнить по описанию','secondary')+
      input('category','Категория',product?.category,'maxlength="50" list="training-categories"')+
      '<small data-category-hint aria-live="polite"></small><datalist id="training-categories"><option>Миски и поилки</option><option>Одежда для собак</option><option>Посуда</option><option>Солнцезащитные очки</option></datalist>'+
      input('price','Цена, ₽',product?.price,'type="number" min="1" max="1000000"')+
      input('stock','Остаток, шт.',product?.stock??1,'type="number" min="1" max="100000"');
  }

  function productDialog(id){
    const product=id==='first'?draft.product:draft.extraProducts.find(row=>row.id===Number(id));
    const step=product&&id!=='first'?'catalog-edit-'+product.id:!draft.product||id==='first'?'catalog-first':'catalog-add';
    dialog(product?'Изменить товар':'Новый товар',form(step,productFields(product),'Сохранить товар'));
  }

  function lesson(step){
    switch(step){
      case 'profile':
        return form(step,'<p>Описание видно в блоке «О сообществе». Напишите, что вы продаёте и в каком городе работаете.</p>'+
          input('name','Название',draft.name,'maxlength="70"')+area('description','Описание',draft.description));
      case 'product':
        return form(step,'<p>Категория определяет, где покупатель найдёт товар в Маркете. Например, для миски подойдёт «Миски и поилки».</p>'+
          productFields(draft.product),'Опубликовать карточку');
      case 'payment':
        return form(step,'<p>ВКонтакте покупатель оформляет заказ и выбирает VK Pay или банковскую карту. Если карточка ведёт на Ozon, заказ оформляется на площадке. Сообщения нужны для вопросов и поддержки.</p>'+
          select('mode','Способ покупки',{vk:'ВКонтакте · VK Pay или карта'},draft.payment?.mode),'Выбрать способ');
      case 'recipient':
        if(!draft.payment?.mode)return prerequisite('Сначала выберите способ покупки.','payment');
        return form(step,chat()?area('recipient','Первый ответ',draft.payment.recipient||'Здравствуйте! Подскажите, как вам удобнее получить заказ?'):
          '<p>Укажите вымышленное имя. В рабочем кабинете здесь проверяют, куда поступит оплата.</p>'+input('recipient','Получатель платежей',draft.payment.recipient,'maxlength="70"'));
      case 'connect':
        if(!draft.payment?.recipient)return prerequisite(chat()?'Сначала подготовьте первый ответ.':'Сначала укажите получателя платежей.','recipient');
        return form(step,`<p>${chat()?'Шаблон ответа: ':'Получатель: '}<strong>${esc(draft.payment.recipient)}</strong></p>`,
          chat()?'Включить сообщения':'Включить тестовую оплату');
      case 'delivery':
        return form(step,'<p>Цена и срок доставки видны покупателю до оформления. Самовывоз в демо бесплатный.</p>'+
          select('method','Способ получения',{courier:deliveryMethods.courier,cdek:deliveryMethods.cdek,pickup:deliveryMethods.pickup},draft.delivery?.method)+
          input('fee','Стоимость доставки, ₽',draft.delivery?.fee??199,'type="number" min="0" max="100000"')+
          input('days','Срок доставки, дней',draft.delivery?.days??3,'type="number" min="1" max="99"')+
          `<label>Адрес самовывоза<input name="address" value="${esc(draft.delivery?.address||'')}" maxlength="120" placeholder="Заполните для самовывоза"></label>`);
      case 'publish':
        if(!canPublish())return prerequisite('Сначала оформите сообщество, опубликуйте товар и настройте покупку и получение.','setup');
        return form(step,`<p>В публикации появится кнопка товара «${esc(draft.product.name)}». Формат сохранится как источник пробного заказа.</p>`+
          select('format','Формат',{post:'Пост в Ленте',clip:'VK Клипы'},draft.publication?.format)+
          input('title','Заголовок',draft.publication?.title,'maxlength="70"')+area('text','Текст публикации',draft.publication?.text),'Опубликовать');
      case 'visibility':
        if(!draft.publication)return prerequisite('Сначала опубликуйте пост или клип с товаром.','publish');
        return form(step,'<p>Введите запрос покупателя, например часть названия товара или его категорию.</p>'+
          input('query','Поиск в учебном Маркете',draft.query,'maxlength="100"')+
          (draft.searchResult==='miss'?'<p role="status">Карточка не найдена. Проверьте запрос или уточните название и категорию.</p>':'')+
          (draft.searchResult==='match'?`<div class="training-success"><strong>Карточка найдена</strong><p>${esc(draft.product.name)} · ${money(draft.product.price)} · ${esc(draft.product.category)}</p></div>`:''),'Найти товар');
      case 'fulfill':
        return operations();
      case 'report':
        return report();
      default:
        return '';
    }
  }

  function operations(){
    if(draft.inquiry)return form('reply',`<p><strong>Переписки с клиентами</strong></p><p>${esc(draft.inquiry.text)}</p>`+
      area('reply','Ответ покупателю',draft.inquiry.reply||draft.payment.recipient),'Сохранить ответ');
    const current=order();
    if(!current)return `<div class="launch-step-form"><p>Сначала откройте товар глазами покупателя и оформите пробный заказ.</p>
      ${coach(link(buyerPath+'/posts','К публикации','btn secondary'),'Откройте публикацию и оформите пробный заказ.')}</div>`;
    const stages=deliveryStages(current);
    const active=deliveryStep(current);
    const body=`<p><strong>Заказ № ${current.id}</strong> · ${money(current.total)} · ${statusLabel(current)}</p>
      <p>Источник · ${esc(current.source)}</p><p>Выполнение · ${stages[active]}</p>`;
    const view=link(checkoutPath,'Посмотреть заказ покупателя','text-link');
    if(current.payment!=='paid')return `<div class="launch-step-form">${body}<p>Дождитесь подтверждения оплаты перед отправкой.</p>${coach(view,'Перейдите к заказу покупателя и завершите тестовую оплату.')}</div>`;
    return `<form class="launch-step-form" data-form="onboarding" data-id="delivery-status">${body}${view}
      <div class="actions">
        ${active>0?'<button class="btn secondary" name="direction" value="-1">Вернуть на предыдущий этап</button>':''}
        ${active<3?coach('<button class="btn primary" name="direction" value="1">'+stages[active+1]+'</button>','Обновите статус заказа. Покупатель увидит его в уведомлениях.'):coach(link(ownerPath+'/report','К статистике','btn primary'),'Заказ получен. Проверьте, откуда пришёл покупатель.')}
      </div>
    </form>`;
  }

  function report(){
    const current=order();
    if(current?.status!=='received'&&!draft.inquiry?.reply)
      return prerequisite('Сначала обработайте пробный заказ или ответьте покупателю.','fulfill');
    if(draft.report)return `<div class="launch-step-form training-success" role="status"><strong>Обучение завершено</strong>
      <p>Источник заказа · ${esc(source())}</p>${link(ownerPath,'К списку шагов','btn secondary')}</div>`;
    const summary=metrics(draft.orders);
    const outcome=current?`<p>Оформлено на ${money(summary.amount)} · Подтверждено оплат на ${money(summary.revenue)}</p>`
      :'<p>Получено 1 обращение · Отправлен ответ покупателю</p>';
    return form('report',`<p>${current?'Заказы и оплаты':'Переписки с клиентами'} · ${esc(current?.source||draft.inquiry.source)}</p>${outcome}
      <p>Выберите канал, из которого пришёл покупатель.</p>${select('source','Источник',{unknown:'Выберите источник','Лента':'Лента','VK Клипы':'VK Клипы','Маркет':'Маркет'},draft.report?source():'unknown')}
      ${draft.reportError?'<p role="status">Сверьте ответ с источником в сводке.</p>':''}`,'Проверить ответ');
  }

  function posts(owner,lessonTab){
    const p=draft.publication;
    return `<section class="card"><div class="card-head"><h2>Публикации</h2></div>
      ${p?`<article class="publication"><small>${source()}</small><strong>${esc(p.title)}</strong><p class="preline">${esc(p.text)}</p>
      ${owner?(lessonTab?coach(link(buyerPath+'/posts','Открыть глазами покупателя','btn secondary'),'Откройте публикацию от лица покупателя и нажмите на товар.'):link(ownerPath+'/goods',esc(draft.product.name)+' · '+money(draft.product.price),'btn secondary')):
        coach(link(buyerPath+'/checkout',icon('bag',17)+' '+esc(draft.product.name)+' · '+money(draft.product.price),'btn secondary'),
          'Нажмите на товар, чтобы открыть оформление.')}</article>`
      :`<p class="empty-note">Здесь пока нет публикаций.</p>${!owner||lessonTab?coach(link(ownerPath+'/publish','К публикации товара','btn secondary'),'Откройте настройку публикации и прикрепите товар.'):''}`}</section>`;
  }

  function goods(owner,viaPost,lessonTab){
    const products=draft.product?[{...draft.product,id:'first'},...draft.extraProducts]:[];
    const add=btn('training-product','Добавить товар','primary');
    return `<section class="card training-preview">
      <div class="card-head"><h2>Товары</h2>${owner?(lessonTab?coach(add,'Добавьте товар, который появится на витрине.'):add):''}</div>
      ${products.map(p=>`<article class="message-row"><div class="card-head"><div class="item">
        <span class="community-new-icon">${icon('bag',23)}</span><div><strong>${esc(p.name)}</strong><small>${money(p.price)} · ${esc(p.category)}</small></div>
      </div>${owner?btn('training-product','Изменить','secondary',p.id):''}</div>
      ${p.description?`<p class="preline">${esc(p.description)}</p>`:''}
      ${!owner&&p.id==='first'?(viaPost||order()||draft.inquiry?buyerExercise():draft.publication?coach(link(buyerPath+'/posts','К публикации с товаром','btn secondary space-top'),'Откройте публикацию, чтобы начать пробную покупку.'):''):''}
      </article>`).join('')||`<p class="empty-note">Товаров пока нет.</p>${owner?'':coach(link(ownerPath+'/product','К настройке витрины','btn secondary'),'В режиме продавца добавьте первый товар.')}`}
    </section>`;
  }

  function buyerExercise(){
    if(!ready())return `<div class="training-exercise"><p>Сначала закончите настройку покупки и найдите товар в учебном Маркете.</p>
      ${coach(link(ownerPath,'Вернуться к запуску','btn secondary'),'Вернитесь к настройкам магазина и выполните оставшиеся шаги.')}</div>`;
    if(chat()){
      if(draft.inquiry)return `<div class="training-success"><strong>Переписка с магазином</strong><p>Вы: ${esc(draft.inquiry.text)}</p>
        ${draft.inquiry.reply?`<p>${esc(draft.name)}: ${esc(draft.inquiry.reply)}</p>`:link(ownerPath+'/fulfill','Ответить как продавец','text-link')}</div>`;
      return form('inquiry',area('text','Сообщение продавцу','Здравствуйте! Как можно получить товар?'),'Отправить обращение');
    }
    const current=order();
    if(!current){
      const delivery=quote(settings(),draft.product.price,draft.delivery.method);
      return form('preview',`<h3>Оформление заказа</h3><p>${deliveryMethods[draft.delivery.method]} · ${delivery.fee?money(delivery.fee):'бесплатно'}${delivery.days?' · '+delivery.days+' дн.':''}</p>
        ${draft.delivery.method==='pickup'?`<p>${esc(draft.delivery.address)}</p>`:''}<strong>Итого · ${money(delivery.total)}</strong>`+
        input('buyer','Имя покупателя','Тестовый покупатель','maxlength="70"'),'Оформить пробный заказ');
    }
    const status=`<p><strong>Заказ № ${current.id}</strong> · ${money(current.total)} · ${statusLabel(current)}</p>`;
    const sellerLink=link(ownerPath+'/fulfill','Открыть заказ как продавец','text-link');
    if(current.payment==='processing')return form('payment-result',status+sellerLink+
      select('result','Результат тестовой оплаты',{paid:'Подтверждена',failed:'Не прошла'},'paid'),'Завершить тестовую оплату');
    if(current.payment==='unpaid'||current.payment==='failed')return form('test-pay',status+sellerLink,'Начать тестовую оплату');
    return `<div class="training-success">${status}<p>Выполнение · ${deliveryStages(current)[deliveryStep(current)]}</p>
      ${draft.messages.map(message=>`<p>Уведомление · ${esc(message.text)}</p>`).join('')}${coach(sellerLink,'Оплата прошла. Откройте заказ со стороны продавца, чтобы обновить доставку.')}</div>`;
  }

  function page(role,step){
    const owner=role!=='buyer';
    const path='new-community/'+(owner?'owner':'buyer');
    const tab=step==='checkout'?'goods':['posts','goods'].includes(step)?step:'home';
    const groups=chapters();
    const selected=owner?currentChapter(groups,step):groups.at(-1);
    return `<section class="card community-hero">
      <div class="community-cover draft-cover"></div>
      <div class="community-identity">
        <span class="community-avatar draft-avatar" aria-hidden="true">${icon('people',32)}</span>
        <div><h1>${esc(draft.name)}</h1><p class="muted">Открытое сообщество</p></div>
      </div>
      ${roleSwitch('new-community',owner)}
      <nav class="tabs community-tabs" aria-label="Страница сообщества">
        ${[['home','Главная'],['posts','Публикации'],['goods','Товары']].map(([key,label])=>
          `<a href="#${key==='home'?path:path+'/'+key}" ${key===tab?'aria-current="page"':''}>${label}</a>`
        ).join('')}
      </nav>
    </section>
    ${journey(groups,selected)}
    <div class="community-columns community-home">
      <div class="community-stack">
        ${owner&&tab==='home'?guide(step,groups,selected):''}
        ${tab==='goods'||tab==='home'&&draft.product?goods(owner,step==='checkout',tab==='goods'):''}
        ${tab!=='goods'?posts(owner,tab==='posts'):''}
      </div>
      <aside class="community-stack"><section class="card">
        <div class="card-head"><h2>О сообществе</h2></div>
        <p class="preline ${draft.description?'':'muted'}">${draft.description?esc(draft.description):'Описание пока не добавлено.'}</p>
      </section></aside>
    </div>`;
  }


  function resetSale(){
    draft.orders=[];
    draft.messages=[];
    delete draft.inquiry;
    draft.report=false;
    draft.reportError=false;
  }

  const saleConfiguration=()=>JSON.stringify([draft.product,draft.payment,draft.delivery,draft.publication]);

  function submit(formNode,submitter){
    const data=new FormData(formNode);
    const value=name=>String(data.get(name)||'').trim();
    const step=formNode.dataset.id;
    const before=saleConfiguration();
    if(step==='product'||step.startsWith('catalog-')){
      if(!value('product')||!value('category')||!value('description')||+value('price')<=0||+value('stock')<=0)return;
      const product={name:value('product'),category:value('category'),description:value('description'),price:+value('price'),stock:+value('stock')};
      if(step==='product'||step==='catalog-first'){
        draft.product=product;
        if(before!==saleConfiguration()){
          resetSale();
          draft.found=false;
          draft.searchResult='';
          delete draft.query;
        }
      }else if(step==='catalog-add'){
        draft.extraProducts.push({...product,id:Math.max(0,...draft.extraProducts.map(row=>row.id))+1});
      }else{
        const existing=draft.extraProducts.find(row=>row.id===Number(step.slice('catalog-edit-'.length)));
        if(!existing)return;
        Object.assign(existing,product);
      }
      if(step==='product')go(ownerPath);
      else closeDialog();
      save('Товар сохранён');
      return;
    }
    switch(step){
      case 'reset':
        if(location.hash!=='#'+ownerPath&&!location.hash.startsWith('#'+ownerPath+'/'))return;
        for(const field of Object.keys(draft))delete draft[field];
        Object.assign(draft,initialDraft());
        closeDialog();
        go(ownerPath);
        save('Демо сообщества сброшено');
        return;
      case 'profile':
        if(!value('name')||!value('description'))return;
        draft.name=value('name');
        draft.description=value('description');
        break;
      case 'payment':
        if(!['vk'].includes(value('mode')))return;
        if(draft.payment?.mode!==value('mode'))draft.payment={mode:value('mode')};
        break;
      case 'recipient':
        if(!draft.payment||!value('recipient'))return;
        if(draft.payment.recipient!==value('recipient'))draft.payment.connected=false;
        draft.payment.recipient=value('recipient');
        break;
      case 'connect':
        if(!draft.payment?.recipient)return;
        draft.payment.connected=true;
        break;
      case 'delivery':
        if(!['courier','cdek','pickup'].includes(value('method')))return;
        if(value('method')==='pickup'&&!value('address')){
          const field=formNode.elements.address;
          field.setCustomValidity('Укажите адрес самовывоза');
          field.reportValidity();
          field.addEventListener('input',()=>field.setCustomValidity(''),{once:true});
          formNode.elements.method.addEventListener('change',()=>field.setCustomValidity(''),{once:true});
          return;
        }
        draft.delivery={method:value('method'),fee:+value('fee'),days:+value('days'),address:value('address')};
        break;
      case 'publish':
        if(!canPublish()||!['post','clip'].includes(value('format'))||!value('title')||!value('text'))return;
        draft.publication={format:value('format'),title:value('title'),text:value('text')};
        break;
      case 'visibility':
        if(!draft.publication||!value('query'))return;
        draft.query=value('query');
        const match=marketMatch({...draft.product,modes:[draft.payment.mode]},draft.query,settings());
        draft.found=draft.found||match;
        draft.searchResult=match?'match':'miss';
        if(match)go(ownerPath);
        save(match?'Карточка найдена в учебном Маркете':'');
        return;
      case 'preview': {
        if(!ready()||chat()||order()||!value('buyer'))return;
        const product={...draft.product,id:1,modes:['vk']};
        placeOrder({settings:settings(),orders:draft.orders,community:{address:draft.delivery.address}},
          [{product,quantity:1,source:source()}],value('buyer'),'Демо',draft.delivery.method);
        save('Пробный заказ оформлен');
        return;
      }
      case 'test-pay':
        if(!['unpaid','failed'].includes(order()?.payment))return;
        order().payment='processing';
        save('Тестовый платёж обрабатывается');
        return;
      case 'payment-result':
        if(order()?.payment!=='processing'||!['paid','failed'].includes(value('result')))return;
        order().payment=value('result');
        save('Статус оплаты обновлён');
        return;
      case 'inquiry':
        if(!ready()||!chat()||draft.inquiry||!value('text'))return;
        draft.inquiry={text:value('text'),source:source()};
        save('Обращение появилось у продавца');
        return;
      case 'reply':
        if(!draft.inquiry||!value('reply'))return;
        draft.inquiry.reply=value('reply');
        save('Ответ появится у покупателя');
        return;
      case 'delivery-status':
        if(changeDelivery(draft,order(),submitter?.value==='-1'?-1:1)){
          if(order().status!=='received'){draft.report=false;draft.reportError=false;}
          save('Статус доставки обновлён');
        }
        return;
      case 'report':
        if(order()?.status!=='received'&&!draft.inquiry?.reply)return;
        draft.report=value('source')===source();
        draft.reportError=!draft.report;
        save(draft.report?'Обучение завершено':'');
        return;
      default:
        return;
    }
    if(before!==saleConfiguration()){
      resetSale();
      if(step==='publish'){
        draft.found=false;
        draft.searchResult='';
        delete draft.query;
      }
    }
    go(ownerPath);
    save('Шаг сохранён');
  }

  function resetPrompt(){
    dialog('Сбросить демо сообщества?',form('reset',
      '<p>Удалятся название, описание, товары, публикация, настройки и учебные заказы нового сообщества. После сброса можно пройти обучение заново.</p>'+
      btn('close','Отмена','secondary'),'Сбросить демо'));
  }

  return {list,page,roleSwitch,submit,resetPrompt,productDialog};
}
