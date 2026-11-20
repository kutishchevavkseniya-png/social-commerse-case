import {initEcosystem,ecosystemUI,illustration,friends} from './ecosystem.js?v=20261120-3';
import {initCommunity,communityUI} from './community.js?v=20261120-3';
import {shopUI} from './shop-ui.js?v=20261120-3';
import {marketUI,partnerProducts} from './market-ui.js?v=20261120-3';
import {availableDelivery,deliveryMethods,ozonPoints,arrivalDate,marketMatch,quote,suggestCategory,purchaseModes,purchaseLabels,ozonUrl,cartModes} from './commerce.js?v=20261120-3';
import {channels, initialState, metrics, ready, placeOrder, placeOrders} from './store.js?v=20261120-3';
import {changeDelivery,deliveryStages,deliveryStep,deliveryLabel} from './delivery.js?v=20261120-3';
import {onboardingUI} from './onboarding.js?v=20261120-3';
import {lessonSpotlight} from './lesson-spotlight.js?v=20261120-3';
import {messengerUI} from './messenger.js?v=20261120-3';
import {productInfo} from './product-info.js';
import {initCase,caseFeatures} from './case-features.js?v=20261120-3';
import {icon} from './icons.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const refreshLessonSpotlight = lessonSpotlight(app);
const toast = document.querySelector('#toast');
const key = 'vk-case-champ-v1';
const publications = {
  0:{title:'Пончо для собак',format:'Клип магазина «Бишка» · 0:32',views:12480,opens:312,starts:54,orders:2},
  1:{title:'Готовимся к прогулкам под дождём',format:'Запись сообщества «Бишка»',views:3100,opens:146,starts:27,orders:2}
};
let state;
try { state = JSON.parse(localStorage.getItem(key)) || initialState(); }
catch { state = initialState(); }
state.events ??= [];
if(!state.settings.payment&&!state.settings.delivery&&!Object.hasOwn(state.settings,'deliveryMethods')){
  state.settings={...state.settings,payment:true,delivery:true,deliveryMethods:['courier','pickup']};
}
initCommunity(state);
initEcosystem(state);
initCase(state);
state.saved ??= [];
if(!state.settings.ozonDemoInitialized){
  state.settings.deliveryMethods=[...new Set([...(state.settings.deliveryMethods??['courier']),'ozon'])];
  state.settings.ozonDemoInitialized=true;
}
if(!state.products.some(p=>p.kind==='rope-toy')){
  state.products.push({id:Math.max(0,...state.products.map(p=>p.id))+1,name:'Игрушка «Канат»',price:490,stock:0,kind:'rope-toy',sellerId:'bishka',color:'#ecedf2',category:'Игрушки для собак'});
}
function startShopChat(){
  if(location.hash==='#inbox/shop'&&state.community.messages&&!state.shopChatStarted){
    state.shopChatStarted=true;
    localStorage.setItem(key,JSON.stringify(state));
  }
}
let channel = 0;
let orderFilter = 'all';
let marketQuery = '';
const marketPages = new Set(['market','market-shop','market-saved','market-ozon','market-item','market-reviews','for-you','authors','referrals','cart','my-orders','support']);
let toastTimer;
const businessSections = [
  {label:'Обзор',pages:{business:'Обзор','vk-start':'VK Start'}},
  {label:'Общение',pages:{clients:'Переписки с клиентами',questions:'Вопросы покупателей','bot-settings':'Помощник магазина',operator:'Поддержка'}},
  {label:'Заказы',pages:{orders:'Заказы',payments:'Платежи'}},
  {label:'Ассортимент',pages:{products:'Товары','variant-stock':'Остатки по размерам',collections:'Подборки',services:'Услуги',promos:'Промокоды'}},
  {label:'Продвижение',pages:{content:'Контент и каналы',campaigns:'Реклама','ad-helper':'Помощник по продвижению'}},
  {label:'Настройки',pages:{settings:'Оплата и доставка',manage:'Сообщество',integrations:'Интеграции',verification:'Проверка продавца',help:'Справка'}}
];
const businessTitles=Object.assign({},...businessSections.map(section=>section.pages));
const statusText = {unpaid:'Не оплачено',processing:'Обрабатывается',paid:'Оплачено',failed:'Не прошла',refunded:'Возвращена'};
const orderText = {new:'Новый',received:'Получен',cancelRequested:'Запрошена отмена',cancelled:'Отменён'};
const fmt = value => new Intl.NumberFormat('ru-RU').format(value);
const money = value => fmt(value)+' ₽';
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const go = route => { location.hash = route; };
const link = (route,label,cls='',aria='') =>
  '<a class="'+cls+'" href="#'+route+'"'+(aria?' aria-label="'+aria+'"':'')+'>'+label+'</a>';
const btn = (action,label,cls='secondary',id='') => '<button type="button" class="btn '+cls+'" data-action="'+action+'" data-id="'+id+'">'+label+'</button>';
const badge = (label,cls='') => '<span class="badge '+cls+'">'+label+'</span>';
const paymentBadge = o => badge(statusText[o.payment],{paid:'green',processing:'orange',failed:'red'}[o.payment] || '');
function saveMessage(message){
  toast.textContent=message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
}
function save(message){
  try{localStorage.setItem(key,JSON.stringify(state));}catch{saveMessage('Не хватает памяти браузера. Уменьшите размер прикреплённых файлов.');return;}
  render();
  if(message)saveMessage(message);
}
function dialog(title,body){
  delete modal.dataset.product;
  modal.setAttribute('aria-labelledby','dialog-title');
  modal.innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+title+'</h2><button type="button" class="close" aria-label="Закрыть" data-action="close">×</button></div>'+body;
  if(!modal.open)modal.showModal();
  else modal.querySelector('.close').focus({preventScroll:true});
  modal.scrollTop=0;
}
function table(headers,rows,empty='Здесь пока ничего нет'){
  return '<div class="table-wrap"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+
    (rows.length ? rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('') : '<tr><td colspan="'+headers.length+'">'+empty+'</td></tr>')+
    '</tbody></table></div>';
}
const demoPhotos={2:'bowl',3:'lead',101:'coat',102:'bowl-cloud',103:'lead',104:'ball',105:'mug',106:'vase',
  107:'organizer',108:'soap',109:'cream',110:'brush',111:'harness',112:'candle'};
function productImage(p){
  if(p.cover)return '<img src="'+esc(p.cover)+'" alt="'+esc(p.name)+'">';
  if(p.kind==='beiber') return '<img src="./public/media/beiber-ozon.webp" alt="Спрей BEIBER «Сочный арбуз»">';
  if(p.kind==='poncho') return '<img src="./public/media/poncho.webp" alt="Собака в синем пончо">';
  const photo=demoPhotos[p.id]||(p.kind==='rope-toy'?'rope-toy':null)||partnerProducts.find(item=>item.id===p.id)?.kind;
  if(photo)return '<img src="./public/media/catalog/'+photo+'.webp" alt="'+esc(p.name)+'" loading="lazy" decoding="async">';
  return illustration(p);
}
const onboarding=onboardingUI(state,{esc,link,money,save,go,btn,dialog,closeDialog:()=>modal.close()});
const community=communityUI(state,{esc,link,btn,money,badge,dialog,save,go,productImage,table,roleSwitch:onboarding.roleSwitch});
const messenger=messengerUI(state,{esc,money,save,go});
const shop=shopUI(state,{esc,link,btn,money,table,partnerProducts});
const marketView=marketUI(state,{esc,link,btn,money,productImage,shop});
const features=caseFeatures(state,{esc,link,btn,money,table,save,go,card:marketView.card,record,toast:saveMessage});
const ecosystem=ecosystemUI(state,{esc,btn,link,money,dialog,save,go,productImage,findProduct:shop.findProduct,partnerProducts,card:marketView.card,cartAction:shop.cartAction,toast:saveMessage,variantButtons:features.variantButtons});
let orderSearch='';
let orderStatus='all';
const orderSource=o=>Array.from(new Set((o.items?.map(item=>item.source)||[o.source]).filter(value=>channels.includes(value)))).join(' · ')||channels[4];
const sourcedOrders=source=>state.orders.filter(order=>(!order.sellerId||order.sellerId==='bishka')&&(order.source===source||order.items?.some(item=>item.source===source)));
function openCount(source){
  const idx=channels.indexOf(source);
  return idx===4?null:([660,420,220,180][idx]||0)+state.events.filter(e=>e.source===source&&e.type==='open').length;
}
function record(type,source,publication=0,trial=0){
  state.events.push({type,source,publication,trial});
  localStorage.setItem(key,JSON.stringify(state));
}
function readiness(){
  const published=state.products.some(p=>p.stock>0&&purchaseModes(p).includes('vk'));
  const steps=[['Опубликован товар для покупки ВКонтакте',published,'products'],
    ['Настроена доставка',availableDelivery(state.settings).length>0,'settings'],
    ['Подключён VK Pay',state.settings.payment,'settings']];
  const next=steps.find(([,done])=>!done);
  const done=steps.filter(([,ok])=>ok).length;
  return '<section class="card readiness"><div class="card-head"><h2>Готовность магазина</h2>'+badge(done+' из '+steps.length,done===steps.length?'green':'blue')+'</div>'+
    '<p class="muted">Покупка внутри ВКонтакте</p>'+
    '<div class="progress" aria-label="Выполнено '+done+' из '+steps.length+'"><span style="width:'+done/steps.length*100+'%"></span></div>'+
    steps.map(([label,ok,route])=>link(route,'<span class="step-icon '+(ok?'done':'')+'">'+(ok?icon('check',14):'')+'</span><span>'+label+'</span>'+icon('arrow',14),'step')).join('')+
    link(next?next[2]:'market-shop',next?'Продолжить настройку':'Проверить как покупатель','btn primary full')+'</section>';
}
function chart(){
  const ownOrders=state.orders.filter(o=>!o.sellerId||o.sellerId==='bishka');
  const end=ownOrders.reduce((date,o)=>o.date>date?o.date:date,'2026-11-16');
  const format=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'});
  const data=Array.from({length:7},(_,i)=>{
    const date=new Date(Date.parse(end)-86400000*(6-i));
    return {day:format.format(date),...metrics(ownOrders.filter(o=>o.date===date.toISOString().slice(0,10)))};
  });
  const max=Math.max(4,...data.map(d=>d.count));
  return '<div class="chart-legend"><span>Оформлено</span><span>Оплачено</span></div><div class="chart" aria-label="Заказы и оплаты с '+data[0].day+' по '+data.at(-1).day+'">'+
    data.map(d=>'<div class="chart-day" tabindex="0" aria-label="'+d.day+': оформлено '+d.count+', оплачено '+d.paid+'"><div class="chart-tooltip" aria-hidden="true"><strong>'+d.day+'</strong><br>Оформлено: '+d.count+'<br>Оплачено: '+d.paid+'</div><div class="bars"><i style="height:'+d.count/max*100+'%"></i><i style="height:'+d.paid/max*100+'%"></i></div><span>'+d.day+'</span></div>').join('')+'</div>';
}
function overview(){
  const m=metrics(state.orders.filter(o=>!o.sellerId||o.sellerId==='bishka'));
  const stats=[['Оформлено заказов',fmt(m.count),'На сумму '+money(m.amount),'bag'],['Оплачено заказов',fmt(m.paid),'Из '+fmt(m.count)+' оформленных','check'],['Подтверждено оплат',money(m.revenue),'VK Pay и оплаты вне VK','card']];
  const shortcuts=[
    ['clients','Переписки с клиентами','Вопросы о товарах, услугах и заказах','chat'],
    ['orders','Заказы','Статусы, доставка и оплата','box'],
    ['products','Товары','Карточки, цены и остатки','bag']
  ];
  return '<section class="case-hero"><p class="case-kicker">VK Start</p><h1>Первый заказ начинается здесь</h1><p>Настройте витрину, проведите покупку из клипа и проверьте результат в кабинете.</p><div class="actions">'+link('vk-start','Пройти сценарий','btn white')+'</div></section><section class="business-shortcuts" aria-label="Быстрый доступ">'+shortcuts.map(([path,label,hint,glyph])=>link(
    path,'<span class="business-shortcut-icon">'+icon(glyph,22)+'</span><span><strong>'+label+'</strong><small>'+hint+'</small></span>'+icon('arrow',16),'card business-shortcut'
  )).join('')+'</section><div class="metrics">'+stats.map(([label,value,note,glyph])=>'<section class="card metric"><div class="metric-label">'+label+'<span>'+icon(glyph,17)+'</span></div><strong>'+value+'</strong><small>'+note+'</small></section>').join('')+'</div>'+
    '<div class="overview-grid"><section class="card"><div class="card-head"><h2>Заказы и оплаты</h2><span class="muted">7 дней до последнего заказа</span></div>'+chart()+'</section>'+readiness()+'</div>'+
    '<section class="card callout"><span class="large-icon">'+icon('check',24)+'</span><div><h2>Обучение запуску магазина</h2><p>Настройте первый магазин и проверьте, как его увидит покупатель.</p></div>'+link('new-community/owner','Открыть обучение','btn secondary')+'</section>'+
    '<section class="card sources"><div class="card-head"><h2>Источники заказов</h2>'+link('content','Контент и каналы '+icon('arrow',14),'text-link')+'</div>'+
    '<div class="source-list">'+channels.map((c,i)=>{const count=sourcedOrders(c).length;return link('content/'+i,'<span>'+c+'</span><span class="track"><i style="width:'+count/Math.max(1,m.count)*100+'%"></i></span><strong>'+count+'</strong>','source');}).join('')+'</div></section>';
}
function publicationDetail(source,index){
  if(![0,1].includes(index))return '';
  const rows=state.publications.filter(p=>index===0?p.type==='clip':p.type!=='clip');
  return '<section class="card"><div class="card-head"><h2>Публикации · '+source+'</h2>'+btn('community-compose','Создать публикацию')+'</div>'+
    table(['Публикация','Просмотры','Открытия','Оформления','Заказы','Оплаты'],rows.map(p=>{
      const seed=p.id===index+1?publications[index]:null;
      const events=state.events.filter(e=>e.publication===p.id);
      const orders=sourcedOrders(source);
      const seedOrders=seed?orders.filter(o=>!o.demo).slice(0,seed.orders):[];
      const linked=orders.filter(o=>o.items?.some(item=>item.publication===p.id)).concat(seedOrders);
      return [link('community/'+p.type,esc(p.title),'text-link'),fmt((seed?.views||0)+events.filter(e=>e.type==='view').length),
        fmt((seed?.opens||0)+events.filter(e=>e.type==='open').length),
        fmt((seed?.starts||0)+events.filter(e=>e.type==='checkout').length),
        linked.length,metrics(linked).paid];
    }))+'</section>';
}
function content(){
  const source=channels[channel];
  return '<section class="card"><div class="card-head"><h2>Источники продаж</h2></div>'+table(['Канал','Открытия карточек','Заказы','Оплаты'],channels.map((c,i)=>{
    const row=metrics(sourcedOrders(c));
    return [[0,1].includes(i)?link('content/'+i,c,'text-link '+(i===channel?'selected':'')):c,openCount(c)===null?'—':fmt(openCount(c)),row.count,row.paid];
  }))+'<p class="muted source-note">Если в заказе товары из разных каналов, заказ учитывается в каждом из них. В общем числе заказов он считается один раз.</p></section>'+publicationDetail(source,channel)+retailTrials();
}
function products(){
  return '<section class="card"><div class="card-head"><h2>Карточки товаров <span class="muted">'+state.products.filter(p=>p.sellerId==='bishka').length+'</span></h2>'+btn('edit-product','Добавить товар','primary')+'</div>'+
  table(['Товар','Цена','Остаток','В Маркете',''],state.products.filter(p=>p.sellerId==='bishka').map(p=>[
    '<div class="item">'+productImage(p)+'<div><strong>'+esc(p.name)+'</strong><small>'+esc(p.category)+'</small></div></div>',money(p.price),p.stock+' шт.',
    badge(p.stock?'Виден':'Нет в наличии',p.stock?'green':''),'<div class="actions">'+btn('edit-product','Изменить','secondary',p.id)+btn('check-product','Проверить готовность','secondary',p.id)+'</div>']))+'</section>'+
    '<section class="card callout"><span class="large-icon">'+icon('eye',25)+'</span><div><h2>Проверьте путь до заказа</h2><p>Откройте витрину и посмотрите, какие условия увидит покупатель.</p></div>'+link('market-shop','Открыть витрину','btn secondary')+'</section>';
}
function orders(){
  const all=state.orders.filter(o=>(!o.sellerId||o.sellerId==='bishka')&&(orderFilter==='all'||o.payment===orderFilter)&&
    (orderStatus==='all'||o.status===orderStatus)&&String(o.id+' '+o.name+' '+o.product+' '+(o.label||'')).toLowerCase().includes(orderSearch.toLowerCase()));
  return '<section class="card"><div class="card-head"><h2>Все заказы <span class="muted">'+all.length+'</span></h2><select id="order-filter" aria-label="Статус оплаты">'+[['all','Все оплаты'],...Object.entries(statusText)].map(([k,v])=>'<option value="'+k+'" '+(orderFilter===k?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
    '<form class="search-form" data-form="order-search"><input aria-label="Поиск по заказам" name="query" placeholder="Номер, имя или товар" value="'+esc(orderSearch)+'"><select name="status" aria-label="Выполнение">'+[['all','Все статусы'],...Object.entries(orderText)].map(([k,v])=>'<option value="'+k+'" '+(orderStatus===k?'selected':'')+'>'+v+'</option>').join('')+'</select><button class="btn secondary">Найти</button></form>'+
    table(['Заказ','Источник','Сумма','Оплата','Выполнение'],all.map(o=>[link('order/'+o.id,'№ '+o.id,'text-link')+'<small>'+esc(o.name)+'</small>'+(o.label?badge(esc(o.label),'blue'):''),esc(orderSource(o)),money(o.total),paymentBadge(o),badge(orderStatusLabel(o),o.status==='received'?'green':o.status==='cancelRequested'?'orange':'')]))+'</section>';
}
function payments(){
  const m=metrics(state.orders.filter(o=>!o.sellerId||o.sellerId==='bishka'));
  return '<div class="metrics"><section class="card metric"><div class="metric-label">Сумма оформленных заказов</div><strong>'+money(m.amount)+'</strong></section><section class="card metric"><div class="metric-label">Подтверждённые оплаты</div><strong>'+money(m.revenue)+'</strong></section><section class="card metric"><div class="metric-label">Статус VK Pay</div><strong class="status-value">'+(state.settings.payment?'Подключён':'Не подключён')+'</strong>'+link('settings','Настроить','text-link')+'</section></div>'+
    '<section class="card"><div class="card-head"><h2>Платежи по заказам</h2></div>'+table(['Заказ','Способ','Сумма','Статус'],state.orders.filter(o=>!o.sellerId||o.sellerId==='bishka').map(o=>[link('order/'+o.id,'№ '+o.id,'text-link'),o.method==='vk'?'VK Pay':'Вне VK',money(o.total),paymentBadge(o)]))+'</section>';
}
function settings(){
  const config=state.settings;
  const check=(name,label,checked,hint='')=>`<label class="setting-switch"><span><strong>${label}</strong>${hint?'<small>'+hint+'</small>':''}</span><input type="checkbox" role="switch" name="${name}" ${checked?'checked':''}></label>`;
  return `<section class="card settings"><div class="card-head"><h2>Оплата и доставка</h2>${badge(ready(state)?'Готов к заказам':'Требуется настройка',ready(state)?'green':'orange')}</div>
    <form class="store-settings" data-form="settings">
      <fieldset class="settings-group"><legend>Оплата ВКонтакте</legend>
        ${check('payment','VK Pay',config.payment,'В демо можно проверить оплату. Деньги не списываются.')}
        <label>Минимальная сумма товаров, ₽<input name="minimum" type="number" min="0" max="100000" value="${config.minimum||0}"></label>
      </fieldset>
      <fieldset class="settings-group"><legend>Доставка</legend>
        ${check('delivery','Принимать заказы с доставкой или самовывозом',config.delivery)}
        <div class="delivery-settings" ${config.delivery?'':'hidden'}>
          <div class="delivery-options">${Object.entries(deliveryMethods).map(([code,label])=>`<label class="check-row"><input type="checkbox" name="method-${code}" ${(config.deliveryMethods??['courier']).includes(code)?'checked':''}>${label}</label>`).join('')}</div>
          ${check('freeDelivery','Доставка за счёт магазина',config.freeDelivery)}
          <div class="field-grid"><label>Стоимость, ₽<input name="price" required type="number" min="0" max="100000" value="${config.price}"></label><label>Доставка, дней<input name="days" required type="number" min="1" max="99" value="${config.days}"></label><label>Комплектация, дней<input name="packingDays" type="number" min="0" max="30" value="${config.packingDays||0}"></label></div>
        </div>
      </fieldset>
      <label>Условия оплаты, доставки и возврата<textarea name="policy" rows="3" maxlength="600" placeholder="Эти условия покупатель увидит в карточке товара">${esc(config.policy||'')}</textarea></label>
      <div class="actions"><button class="btn primary">Сохранить настройки</button></div>
    </form></section>`;
}
function retailTrials(){
  if(!state.trials.length)return '';
  const rows=state.trials.map(trial=>{
    const product=state.products.find(p=>p.id===trial.productId);
    const events=state.events.filter(event=>event.trial===trial.productId);
    const orders=state.orders.filter(o=>o.items?.some(item=>item.trial===trial.productId));
    return [esc(product?.name||'Товар'),events.filter(e=>e.type==='impression').length,
      events.filter(e=>e.type==='open').length,events.filter(e=>e.type==='checkout').length,metrics(orders).paid];
  });
  return '<section class="card"><div class="card-head"><h2>Первые показы в Маркете</h2>'+link('market','Посмотреть выдачу','text-link')+'</div>'+
    table(['Товар','Показы','Открытия','Оформления','Оплаты'],rows)+'</section>';
}
function orderStatusLabel(order){
  return order.demo&&order.status==='new'&&deliveryStep(order)>0
    ?deliveryStages(order)[deliveryStep(order)]
    :orderText[order.status];
}
function tracking(order,buyer){
  const steps=deliveryStages(order);
  const current=deliveryStep(order);
  const active=!['cancelled','cancelRequested'].includes(order.status);
  const canEdit=!buyer&&order.demo&&active&&order.payment==='paid'&&(!order.gift||order.gift.accepted);
  return `<section class="card" id="tracking"><div class="card-head"><h2>Отслеживание</h2><span class="muted">${deliveryLabel(order)}</span></div>
    ${active?`<ol class="tracking-steps">${steps.map((step,index)=>`<li class="${index<=current?'done':''}" ${index===current?'aria-current="step"':''}>
      <span class="tracking-dot" aria-hidden="true">${index<current?icon('check',12):''}</span>${step}
    </li>`).join('')}</ol>`:`<p>${orderText[order.status]}</p>`}
    ${canEdit?`<div class="actions">${current>0?btn('rewind-delivery','Вернуть на предыдущий этап','secondary',order.id):''}${current<steps.length-1?btn('advance-delivery',steps[current+1],'primary',order.id):''}</div><small>Покупатель увидит обновление в уведомлениях о доставке.</small>`:''}
    ${buyer&&active&&!current&&order.payment!=='paid'?'<p class="muted">Статус обновится после оплаты и обработки заказа.</p>':''}
  </section>`;
}
function orderDetail(id,buyer){
  const o=state.orders.find(o=>o.id===id&&(buyer?o.demo:!o.sellerId||o.sellerId==='bishka'));
  if(!o)return '<section class="card">Заказ не найден.</section>';
  let actions=link((buyer?'inbox/order/':'clients/')+o.id,buyer?'Написать магазину':'Переписка с клиентом','btn secondary');
  if(buyer&&o.demo)actions+=link('inbox/delivery','Уведомления о доставке','btn secondary');
  if(buyer&&o.status==='received'&&o.payment==='paid')actions+=btn('write-review',unreviewedItems(o).length?'Оставить отзыв':'Дополнить отзыв','secondary',o.id);
  if(buyer && o.status==='new'){
    if(['unpaid','failed'].includes(o.payment)) actions+=btn('start-pay','Оплатить · VK Pay или карта','primary',o.id);
    if(o.payment==='processing') actions+=btn('resolve-pay','Завершить тестовую оплату','primary',o.id);
    actions+=btn('request-cancel','Запросить отмену','secondary',o.id);
  }
  if(!buyer&&o.demo&&o.status==='new'&&o.payment==='paid')actions+=btn('delivery-delay',o.delayed?'Возобновить доставку':'Сообщить о задержке','secondary',o.id);
  if(o.delayed&&o.status==='new')actions+=badge('Доставка задерживается','orange');
  if(buyer&&o.demo&&o.status==='received'&&o.payment==='paid')actions+=o.returnRequested?badge('Возврат запрошен','orange'):btn('request-return','Запросить возврат','secondary',o.id);
  if(!buyer&&o.returnRequested&&o.payment==='paid')actions+=btn('approve-return','Подтвердить возврат','secondary',o.id);
  if(!buyer && o.status==='cancelRequested') actions+=btn('approve-cancel','Подтвердить отмену','secondary',o.id);
  if(!buyer && !o.demo && o.status==='new' && o.payment==='paid' && (!o.gift||o.gift.accepted)) actions+=btn('received','Отметить полученным','primary',o.id);
  if(!buyer && o.method==='external' && o.status!=='cancelled' && o.payment!=='paid') actions+=btn('external-pay','Подтвердить оплату вне VK','secondary',o.id);
  if(buyer&&o.gift&&o.payment==='paid'&&o.status!=='cancelled'){
    actions+=link('gift/'+o.id,o.gift.accepted?'Посмотреть подарок':'Открыть подарок как получатель','btn primary');
  }
  return '<section class="card"><div class="card-head"><h2>Заказ № '+o.id+'</h2>'+badge(orderStatusLabel(o))+'</div><dl class="kv"><div><dt>Товар</dt><dd>'+esc(o.product)+'</dd></div><div><dt>Покупатель</dt><dd>'+esc(o.name)+'</dd></div><div><dt>Источник</dt><dd>'+esc(orderSource(o))+'</dd></div>'+
    (o.city?'<div><dt>Доставка</dt><dd>'+esc(o.pickupAddress||o.address||o.city)+' · '+(deliveryMethods[o.deliveryMethod]||'Доставка')+' · '+(o.expectedAt||o.days+' дн.')+' · '+money(o.delivery)+'</dd></div>':'')+
    (o.gift?'<div><dt>Подарок для '+esc(o.gift.recipient)+'</dt><dd>'+(o.gift.accepted?'Принят · '+esc(o.gift.variant)+' · '+esc(o.gift.address):'Получатель ещё не указал адрес')+'</dd></div>':'')+
    (o.discount?'<div><dt>Промокод '+esc(o.promo)+'</dt><dd>−'+money(o.discount)+'</dd></div>':'')+
    '<div><dt>Сумма заказа</dt><dd>'+money(o.total)+'</dd></div><div><dt>Оплата</dt><dd>'+paymentBadge(o)+'</dd></div></dl>'+
    (buyer?'<p class="muted">Подтверждение и обновления статуса доступны в Мессенджере. Этот заказ можно снова открыть в разделе «Маркет → Заказы».</p>':'')+
    '<div class="actions">'+actions+link('support/order-'+o.id,'Помощь с заказом','btn secondary')+'</div></section>'+
    (buyer&&o.status==='received'&&unreviewedItems(o).length?'<section class="card"><h2>Как вам покупка?</h2><p>Заказ завершён. Оцените его в одно нажатие — текст необязателен. Напоминание останется в уведомлениях до оценки.</p>'+ecosystem.quickRating(o)+'</section>':'')+
    (o.demo?tracking(o,buyer):'')+(buyer?'':'<section class="card"><div class="card-head"><h2>Заметка продавца</h2></div><form data-form="order-note" data-id="'+o.id+'"><label>Метка<input name="label" maxlength="35" value="'+esc(o.label||'')+'"></label><label>Внутренний комментарий<textarea name="note" rows="3" maxlength="500">'+esc(o.note||'')+'</textarea></label><button class="btn secondary">Сохранить заметку</button></form></section>');
}
function unreviewedItems(order){
  return (order.items||[{productId:order.productId}]).filter(item=>!state.reviews.some(row=>row.orderId===order.id&&row.productId===item.productId));
}
function giftView(id){
  const order=state.orders.find(o=>o.id===Number(id)&&o.gift&&o.payment==='paid'&&!['cancelled','cancelRequested'].includes(o.status));
  if(!order)return '<section class="card"><p>Подарок недоступен.</p></section>';
  const {gift}=order;
  return '<section class="card gift-unpack"><div class="gift-art">🎁</div><div class="card-head"><h2>Подарок для '+esc(gift.recipient)+'</h2>'+badge(gift.accepted?'Принят':'Оплачен','green')+'</div><p>'+esc(order.name)+' дарит вам «'+esc(order.product)+'».</p>'+
    (gift.accepted?'<p class="space-top">'+esc(gift.variant)+' · '+esc(gift.address)+'</p>':!gift.unwrapped?btn('unwrap-gift','Распаковать подарок','primary full',order.id):
      '<p class="muted">Доставка уже оплачена: '+money(order.delivery)+'. Выберите доступный способ без доплаты.</p><form class="space-top" data-form="accept-gift" data-id="'+order.id+'"><label>Вариант товара<select name="variant"><option>Стандартный</option></select></label><label>Способ доставки<select name="method">'+(order.deliveryChoices?.length?order.deliveryChoices:[order.deliveryMethod]).map(code=>'<option value="'+code+'">'+deliveryMethods[code]+'</option>').join('')+'</select></label><label>Адрес получателя<input name="address" required maxlength="160" placeholder="Для демо укажите вымышленный адрес"></label><button class="btn primary">Принять подарок</button></form>')+'</section>';
}
function rewardReferral(order){
  if(order.status!=='received'||order.promo!=='DRUG10'||state.case.referralReward)return;
  state.case.referralReward=order.id;
  state.wallet.balance+=300;
  state.wallet.operations.push({title:'Бонус за приглашение друга',amount:300,at:Date.now()});
}
function buyerOrders(){
  return '<section class="card"><div class="card-head"><h2>Мои заказы</h2></div>'+table(['Заказ','Товар','Сумма','Оплата','Выполнение'],state.orders.filter(o=>o.demo).map(o=>[link('purchase/'+o.id,'№ '+o.id,'text-link'),esc(o.product),money(o.total),paymentBadge(o),o.status==='new'?deliveryStages(o)[deliveryStep(o)]:orderText[o.status]]),'Оформите первый заказ на витрине.')+'</section>';
}
const nav = [['home','Моя страница'],['news','Лента','feed'],['chat','Мессенджер','inbox'],['people','Друзья'],['people','Сообщества','communities'],['music','Музыка'],['play','Видео'],['play','Клипы','clips'],['game','Игры'],['bag','Маркет','market'],['card','VK Pay','wallet'],['bag','Мой бизнес','business']];
const routes={...community.views,...features.routes,product:ecosystem.product,seller:ecosystem.sellerPage,wallet:ecosystem.wallet,notifications:ecosystem.notices,support:ecosystem.support,questions:ecosystem.questions,'bot-settings':ecosystem.bots,communities:onboarding.list,'new-community':onboarding.page,business:overview,inbox:messenger.inbox,clients:messenger.clients,content,products,orders,payments,settings,market:category=>marketView.home(category,marketQuery),'market-shop':category=>marketView.home(category,marketQuery,'shop'),'market-saved':()=>marketView.home('',marketQuery,'saved'),'market-ozon':category=>marketView.home(category,marketQuery,'ozon'),
  integrations:ecosystem.integrations,'market-reviews':marketView.reviews,gift:giftView,cart:shop.cart,'my-orders':buyerOrders,order:id=>orderDetail(Number(id),false),purchase:id=>orderDetail(Number(id),true)};
function businessHeader(page){
  const current=page==='order'?'orders':page;
  const active=businessSections.find(section=>Object.hasOwn(section.pages,current));
  const subnav=Object.entries(active.pages);
  return `<section class="card mast business-mast">
    <div class="mast-row"><img class="shop-avatar" src="./public/media/community-avatar.webp" alt="">
      <div class="mast-copy"><p class="business-store">${esc(state.community.name)}</p><h1>Мой бизнес</h1></div>
      ${link('community/owner','Открыть сообщество','btn secondary')}
    </div>
    <nav class="tabs business-tabs" aria-label="Разделы Моего бизнеса">${businessSections.map(section=>{
      const href=Object.keys(section.pages)[0];
      return `<a href="#${href}" ${section===active?'aria-current="page"':''}>${section.label}</a>`;
    }).join('')}</nav>
    ${subnav.length>1?`<nav class="business-subnav" aria-label="Подразделы ${active.label}">${subnav.map(([href,label])=>
      `<a href="#${href}" ${href===current?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`:''}
  </section>`;
}

function legacyRoute(){
  const [page,id,side]=location.hash.slice(1).split('/');
  if(page==='comments')return 'questions';
  if(page==='market-item')return 'product/'+id;
  if(page==='overview')return 'business';
  if(page==='compare')return 'market-saved';
  if(page==='inbox'&&/^\d+$/.test(id||'')){
    if(side==='seller')return 'clients/'+id;
    return Number(id)?'inbox/order/'+id:'inbox/shop';
  }
  return '';
}

function render(){
  const alias=legacyRoute();
  if(alias)history.replaceState(null,'','#'+alias);
  const [route,arg,detail]=(location.hash.slice(1)||'feed').split('/');
  const page=Object.hasOwn(routes,route)?route:'feed';
  if(page==='content')channel=Number.isInteger(+arg)&&channels[+arg]?+arg:0;
  const inMarket=marketPages.has(page)||page==='purchase';
  document.body.classList.toggle('product-route',page==='product');
  const inBusiness=Object.hasOwn(businessTitles,page)||page==='order';
  const currentClip=page==='clips'?app.querySelector('.clip-player'):null;
  const previousClip=currentClip?.dataset.route===location.hash?currentClip:null;
  const playback=previousClip&&{time:previousClip.currentTime,paused:previousClip.paused,muted:previousClip.muted,viewed:previousClip.dataset.viewed};
  const body=routes[page](arg,detail);
  const activeNav=inBusiness?'business':inMarket?'market':['community','shop-services','new-community'].includes(page)?'communities':page;
  const header=inBusiness?businessHeader(page):inMarket?marketView.toolbar(page,arg,marketQuery):'';
  app.innerHTML='<header class="topbar"><div class="top-inner">'+link('feed','<img src="./public/media/vk.png" alt=""><span>ВКонтакте</span>','brand')+
    '<div class="global-search" aria-disabled="true">'+icon('search',18)+' Поиск</div>'+link('notifications',icon('bell',21)+'<span class="notification-count">'+(state.notifications.length+ecosystem.pending().length||'')+'</span>','top-bell','Уведомления')+'<div class="top-end"><span class="demo">Демоверсия</span><span class="avatar mini" aria-label="Профиль демоверсии">А</span></div></div></header>'+
    '<div class="layout"><aside class="sidebar"><nav aria-label="Меню ВКонтакте">'+nav.map(([glyph,label,target])=>{
      if(!target)return '<span class="nav-item disabled" aria-disabled="true">'+icon(glyph,19)+'<span>'+label+'</span></span>';
      const className='nav-item'+(target==='business'?' business-entry':'')+(target===activeNav?' active':'');
      return '<a href="#'+target+'" aria-label="'+label+'" class="'+className+'" '+(target===activeNav?'aria-current="page"':'')+'>'+icon(glyph,19)+'<span>'+label+'</span></a>';
    }).join('')+'</nav><div class="nav-foot">Демо для VK Case Champ</div></aside>'+
    '<main>'+header+body+'</main></div>';
  refreshLessonSpotlight();
  const player=app.querySelector('.clip-player');
  if(player){
    player.dataset.route=location.hash;
    if(playback){
      if(playback.viewed)player.dataset.viewed=playback.viewed;
      player.muted=playback.muted;
      if(playback.paused)player.autoplay=false;
      player.addEventListener('loadedmetadata',()=>{player.currentTime=playback.time;},{once:true});
    }
  }
}
function productDialog(p,source,publication=0,trial=0){
  const modes=purchaseModes(p);
  const canBuy=shop.buyable(p)&&ready(state)&&p.stock>0;
  const id=p.id+':'+source+':'+publication+':'+trial;
  const external=modes.includes('external')?ozonUrl(p):'';
  dialog(esc(p.name),'<div class="product-dialog-img">'+productImage(p)+'</div><div class="card-head product-buy-head"><strong class="product-price">'+money(p.price)+'</strong>'+badge(p.stock?'В наличии':'Нет в наличии',p.stock?'green':'')+'</div>'+
    '<p class="muted">'+esc(state.community.name)+' · '+esc(p.category)+' · '+shop.modeLabel(p)+'</p>'+
    (p.stock&&shop.buyable(p)&&!canBuy?'<p class="muted">Магазин ещё настраивает оплату и доставку.</p>':'')+
    '<div class="actions product-buy-actions">'+(canBuy?btn('checkout','Купить сейчас','primary',id):'')+shop.cartAction(p,id)+
    (p.stock&&modes.includes('message')&&state.community.messages?btn('product-message','Написать продавцу','secondary',id):'')+
    (p.stock&&external?'<a class="btn secondary" href="'+esc(external)+'" target="_blank" rel="noopener noreferrer">Купить на Ozon</a>':'')+
    marketView.favorite(p)+(canBuy&&availableDelivery(state.settings).some(code=>code!=='pickup')?btn('gift-checkout','Подарить','secondary',id):'')+'</div>'+
    '<div class="product-links">'+btn('product-reviews','Отзывы','secondary',id)+btn('product-terms','Оплата, доставка и возврат','secondary',id)+'</div>'+
    productInfo(p,esc));
  modal.dataset.product=id;
}
function productPanel(p,kind,back){
  const backButton=back?btn('product-back','К товару','secondary',back):'';
  const modes=purchaseModes(p);
  if(kind==='reviews'){
    const rows=state.reviews.filter(row=>row.productId===p.id);
    const count=p.reviewCount?.toLocaleString('ru-RU');
    dialog('Отзывы',`<div class="product-panel"><h3>${esc(p.name)}</h3>${
      rows.length?rows.map(ecosystem.review).join(''):
      count?`<p>★ ${esc(p.rating)} из 5 · ${count} отзывов на Ozon</p><p class="muted">Показана оценка из демокаталога. Тексты отзывов Ozon в демо недоступны.</p>`:
      '<p class="muted">У этого товара пока нет отзывов ВКонтакте.</p>'}
      <div class="actions">${backButton}</div></div>`);
    return;
  }
  const methods=availableDelivery(state.settings);
  dialog('Условия оплаты, доставки и возврата',`<div class="product-panel"><h3>${esc(p.name)}</h3>
    ${p.paymentPolicy?`<p class="muted">${esc(p.paymentPolicy)}</p>`:''}${modes.includes('vk')?`<div class="terms-row">${icon('card',20)}<div><strong>Оплата ВКонтакте</strong><p>${state.settings.payment?'Онлайн через VK Pay или банковской картой. В демо оплата тестовая.':'Приём оплаты через VK Pay пока не настроен.'}</p></div></div>
      <div class="terms-row">${icon('box',20)}<div><strong>Доставка</strong>${methods.length?`<ul>${methods.map(method=>{
        const base=quote(state.settings,p.price,method);const fee=method==='pickup'?base.fee:p.deliveryPrice??base.fee;const days=method==='pickup'?base.days:Math.max(base.days,p.deliveryDays||0);
        return `<li>${deliveryMethods[method]} · ${fee?money(fee):'бесплатно'} · ${days?days+' дн.':'в день заказа'}</li>`;
      }).join('')}</ul>`:'<p>Магазин пока не настроил доставку.</p>'}</div></div>
      <div class="terms-row">${icon('chat',20)}<div><strong>Условия магазина и возврат</strong><p class="preline">${esc(p.returnPolicy||state.settings.policy||'Условия возврата продавца пока не заполнены. Задайте вопрос перед покупкой.')}</p></div></div>`:''}
    ${modes.includes('external')?`<div class="terms-row">${icon('box',20)}<div><strong>Заказ на Ozon</strong><p>При покупке на Ozon способы оплаты, стоимость доставки и условия возврата будут показаны при оформлении на Ozon.</p></div></div>`:''}
    ${modes.includes('message')?`<div class="terms-row">${icon('chat',20)}<div><strong>Заказ в сообщениях</strong><p>Продавец уточнит оплату и способ получения в переписке.</p></div></div>`:''}
    <div class="actions">${backButton}${btn('ask-product','Задать вопрос о товаре','secondary',p.id)}</div></div>`);
}

function editProduct(id){
  const p=state.products.find(p=>p.id===id);
  if(p&&p.sellerId!=='bishka'){saveMessage('Этот товар принадлежит другому сообществу');return;}
  dialog(p?'Изменить товар':'Новый товар','<form data-form="product" data-id="'+(p?.id||'')+'"><label>Название<input name="name" required maxlength="70" value="'+esc(p?.name||'')+'"></label>'+
    '<label>Описание<textarea name="description" rows="2" maxlength="500">'+esc(p?.description||'')+'</textarea></label>'+
    '<div class="actions">'+btn('smart-fill','✦ Заполнить по описанию','secondary')+'</div><label>Фото товара<input type="file" name="photo" accept="image/*"></label>'+btn('smart-cover','✦ Сделать обложку','secondary')+'<div class="cover-preview" data-cover-preview></div><label>Категория<input name="category" required maxlength="50" value="'+esc(p?.category||'')+'"></label><small data-category-hint aria-live="polite"></small>'+
    '<div class="field-grid"><label>Цена, ₽<input name="price" type="number" min="1" max="1000000" required value="'+(p?.price??'')+'"></label><label>Остаток, шт.<input name="stock" type="number" min="0" max="100000" required value="'+(p?.stock??'')+'" '+(p?.variants?'readonly':'')+'></label></div>'+(p?.variants?link('variant-stock','Управлять остатками по размерам','text-link'):'')+
    '<fieldset class="purchase-options"><legend>Способы покупки</legend>'+Object.entries(purchaseLabels).map(([mode,label])=>
      '<label class="check-row"><input type="checkbox" name="modes" value="'+mode+'" '+(purchaseModes(p||{}).includes(mode)?'checked':'')+'> '+label+'</label>').join('')+'</fieldset>'+
    '<label>Ссылка на товар Ozon<input name="externalUrl" type="url" maxlength="500" value="'+esc(p?.externalUrl||'')+'"></label><button class="btn primary">Сохранить товар</button></form>');
}
function checkout(items,identifier,preview=false,gift=false){
  if(!items.length)return;
  if(!ready(state)){
    dialog('Оформление пока недоступно','<p>Для покупки ВКонтакте включите оплату и хотя бы один способ доставки.</p>'+link('settings','Оплата и доставка','btn primary space-top'));
    return;
  }
  dialog(preview?'Проверка оформления':gift?'Оформление подарка':'Оформление заказа',shop.checkoutForm(items,identifier,preview,gift));
  const form=modal.querySelector('form');
  if(form)shop.refreshQuote(form);
}
function itemFor(p,source,publication=0,trial=0){return {product:p,quantity:1,source:channels[source]||'Сообщество',publication,trial};}
function readinessDialog(p){
  const modes=purchaseModes(p);
  const vkReady=modes.includes('vk')&&p.stock>0&&ready(state)&&p.price>=Number(state.settings.minimum||0);
  const canOrder=vkReady||(modes.includes('message')&&state.community.messages)||(modes.includes('external')&&!!ozonUrl(p));
  const fix=modes.includes('vk')?'settings':modes.includes('message')?'manage/contact':'products';
  dialog('Готовность товара','<dl class="kv"><div><dt>Карточка опубликована</dt><dd>Да</dd></div><div><dt>Доступен в поиске Маркета</dt><dd>'+(p.stock?'Да':'Нет, товар закончился')+'</dd></div><div><dt>Способ покупки</dt><dd>'+shop.modeLabel(p)+'</dd></div><div><dt>Покупатель может оформить заказ</dt><dd>'+(canOrder?'Да':'Требует настройки')+'</dd></div></dl>'+
    (!canOrder?(p.stock?link(fix,'Настроить','btn primary'):btn('edit-product','Пополнить остаток','primary',p.id)):vkReady?'<div class="actions">'+btn('preview-checkout','Проверить оформление','primary',p.id)+
      (state.trials.some(row=>row.productId===p.id)?link('content/3','Результаты первых показов','btn secondary'):btn('start-trial','Показать первым покупателям','secondary',p.id))+'</div>':btn('open-product','Посмотреть карточку','primary',p.id+':3')));
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');
  if(!b)return;
  if(features.action(b.dataset.action,b.dataset.id||'')){event.preventDefault();return;}
  if(ecosystem.action(b.dataset.action,b.dataset.id||'',b)){event.preventDefault();return;}
  if(b.dataset.action.startsWith('community-')){community.action(b.dataset.action.slice(10),b.dataset.id);return;}
  const [rawId,rawSource,rawPublication,rawTrial]=b.dataset.id?.split(':')||[];
  const id=+rawId;
  const source=+rawSource===5?5:channels[+rawSource]?+rawSource:4;
  const publication=Number(rawPublication)||0;
  const trial=Number(rawTrial)||0;
  const channelName=channels[source]||'Сообщество';
  const p=shop.findProduct(id);
  const o=state.orders.find(o=>o.id===id);
  switch(b.dataset.action){
    case 'close': modal.close(); break;
    case 'training-reset': onboarding.resetPrompt(); break;
    case 'training-product': onboarding.productDialog(b.dataset.id); break;
    case 'track-product':if(p){state.case.recent=[p.id,...state.case.recent.filter(id=>id!==p.id)].slice(0,24);record('open',channelName,publication,trial);}break;
    case 'open-product': if(p){record('open',channelName,publication,trial);state.case.recent=[p.id,...state.case.recent.filter(id=>id!==p.id)].slice(0,24);localStorage.setItem(key,JSON.stringify(state));go('product/'+p.id+'/'+[source,publication,trial].join(':'));} break;
    case 'market-reset':
      marketQuery='';
      marketView.setFilters();
      if(b.hash===location.hash){render();recordTrialImpressions();}
      break;
    case 'edit-product': editProduct(id);break;
    case 'start-trial':
      if(p?.stock&&shop.buyable(p)&&ready(state)&&p.price>=Number(state.settings.minimum||0)&&!state.trials.some(row=>row.productId===id)){
        state.trials.push({productId:id});
        modal.close();save('Первые показы включены в демоверсии');go('content/3');
      }
      break;
    case 'check-product': if(p)readinessDialog(p);break;
    case 'favorite': {
      if(!p)break;
      const saved=state.saved.includes(id);
      state.saved=saved?state.saved.filter(value=>value!==id):[...state.saved,id];
      const activeProduct=modal.open?modal.dataset.product:null;
      save(saved?'Товар убран из избранного':'Товар в избранном');
      if(activeProduct){
        productDialog(p,...activeProduct.split(':').slice(1).map(Number));
        modal.querySelector('[data-action="favorite"]')?.focus();
      }else app.querySelector('[data-action="favorite"][data-id="'+id+'"]')?.focus();
      break;
    }
    case 'product-back':modal.close();if(p&&!location.hash.startsWith('#product/'))go('product/'+p.id);break;
    case 'product-terms':
    case 'product-reviews': if(p)productPanel(p,b.dataset.action.slice(8),modal.open?modal.dataset.product:'');break;
    case 'market-clear-filters': marketView.setFilters();render();break;
    case 'preview-checkout': if(p)checkout([itemFor(p,3)],p.id+':3:0',true);break;
    case 'gift-checkout':
    case 'checkout':
      if(p&&shop.buyable(p)&&p.stock&&ready(state)){record('checkout',channelName,publication,trial);checkout([itemFor(p,source,publication,trial)],b.dataset.id,false,b.dataset.action==='gift-checkout');}
      break;
    case 'cart-add': {
      if(!p||state.cart.some(row=>row.id===id))break;
      const choices=cartModes(p);
      if(!choices.length)break;
      const mode=choices.includes('vk')?'vk':choices[0];
      state.cart.push({id,mode,quantity:1,source:channelName,publication,trial});
      modal.close();
      save(choices.length>1?'Товар в корзине. Способ покупки можно выбрать в корзине.':'Товар добавлен в корзину');
      break;
    }
    case 'cart-minus':
    case 'cart-plus':
    case 'cart-remove': {
      const item=state.cart.find(row=>row.id===id);
      if(!item)break;
      if(b.dataset.action==='cart-plus'&&p&&(!item.mode||item.mode==='vk')&&shop.buyable(p)&&item.quantity<p.stock)item.quantity++;
      if(b.dataset.action==='cart-minus')item.quantity--;
      if(b.dataset.action==='cart-remove'||item.quantity<1)state.cart=state.cart.filter(row=>row!==item);
      save();break;
    }
    case 'cart-checkout': {
      const items=shop.vkCartItems();
      if(ready(state))for(const item of items)record('checkout',item.source,item.publication,item.trial);
      checkout(items,'cart');break;
    }
    case 'product-message':
      if(p&&purchaseModes(p).includes('message')&&state.community.messages)dialog('Сообщение о товаре','<form data-form="community-message" data-id="0:buyer"><label>Сообщение<textarea name="text" required maxlength="900">Здравствуйте! Хочу узнать о товаре «'+esc(p.name)+'».</textarea></label><button class="btn primary">Отправить</button></form>');
      break;
    case 'write-review':
      if(o){const items=o.items||[{productId:o.productId}];const review=state.reviews.find(r=>r.orderId===o.id&&r.productId===items[0].productId);
        dialog('Отзыв о покупке','<form data-form="review" data-id="'+id+'"><label>Товар<select name="productId">'+items.map(item=>'<option value="'+item.productId+'">'+esc(state.products.find(p=>p.id===item.productId)?.name||o.product)+'</option>').join('')+'</select></label><label>Оценка<select name="rating">'+[5,4,3,2,1].map(n=>'<option '+(n===(review?.rating||5)?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label>Отзыв<textarea name="text" rows="3" maxlength="600">'+esc(review?.text||'')+'</textarea></label><label>Фото или видео (необязательно)<input type="file" name="media" accept="image/*,video/*" multiple></label><small>Можно отправить только оценку.</small><button class="btn primary">Опубликовать отзыв</button></form>');}
      break;
    case 'start-pay':
      if(o?.status==='new'&&['unpaid','failed'].includes(o.payment)){dialog('Оплата заказа № '+o.id,'<p>К оплате '+money(o.total)+'</p><p class="muted">Тестовая операция, деньги не списываются.</p><form data-form="payment-method" data-id="'+o.id+'"><label class="check-row"><input type="radio" name="method" value="vk" '+(state.wallet.preferred==='vk'?'checked':'')+'>VK Pay · '+money(state.wallet.balance)+'</label><label class="check-row"><input type="radio" name="method" value="card" '+(state.wallet.preferred==='card'?'checked':'')+'>Карта •••• '+esc(state.wallet.card)+'</label><button class="btn primary">Подтвердить тестовую оплату</button></form>');}
      break;
    case 'resolve-pay':
      if(o?.status==='new'&&o.payment==='processing')dialog('Результат тестовой оплаты','<p class="muted">Выберите результат для демонстрации статуса платежа.</p><div class="actions">'+btn('payment-paid','Подтверждена','primary',id)+btn('payment-failed','Не прошла','secondary',id)+'</div>');
      break;
    case 'payment-paid':
    case 'payment-failed':
      if(o?.status==='new'&&o.payment==='processing'){
        o.payment=b.dataset.action==='payment-paid'&&(o.payWith!=='vk'||state.wallet.balance>=o.total)?'paid':'failed';
        if(o.payment==='paid'&&o.payWith==='vk')state.wallet.balance-=o.total;
        if(o.gift&&o.payment==='paid')state.notifications.unshift({title:'Подарок отправлен другу',text:o.gift.recipient+' получит подарок в демочате',route:'inbox/gifts'});
        if(o.gift&&o.payment==='paid')state.messages.push({thread:o.id,side:'seller',text:'Подарок оплачен. Получатель может принять его и указать адрес.',gift:o.id,at:Date.now()});
        modal.close();save(statusText[o.payment]);
      }
      break;
    case 'delivery-delay':
      if(o?.demo&&o.status==='new'&&o.payment==='paid'){
        o.delayed=!o.delayed;
        const text=o.delayed?'Доставка задерживается. Уточните новый срок в переписке.':'Доставка возобновлена.';
        state.notifications.unshift({title:'Заказ № '+o.id,text,route:'purchase/'+o.id});
        state.messages.push({thread:o.id,side:'delivery',at:Date.now(),text});
        save(text);
      }
      break;
    case 'request-return':
      if(o?.demo&&o.status==='received'&&o.payment==='paid'&&!o.returnRequested){
        o.returnRequested=true;save('Запрос на возврат отправлен');go('support/order-'+o.id);
      }
      break;
    case 'approve-return':
      if(o?.demo&&o.returnRequested&&o.payment==='paid'){
        o.payment='refunded';
        if(o.payWith==='vk')state.wallet.balance+=o.total;
        state.notifications.unshift({title:'Возврат подтверждён',text:'Заказ № '+o.id+' · '+money(o.total),route:'purchase/'+o.id});
        save('Тестовый возврат проведён');
      }
      break;
    case 'request-cancel':
      if(o?.status==='new'){o.status='cancelRequested';save('Запрос на отмену отправлен продавцу');}
      break;
    case 'approve-cancel':
      if(o?.status==='cancelRequested'){
        if(o.demo)for(const item of o.items||[{productId:o.productId,quantity:1}]){
          const product=state.products.find(product=>product.id===item.productId);
          if(product){
            product.stock+=item.quantity;
            if(item.variant&&product.variants)product.variants[item.variant]+=item.quantity;
          }
        }
        o.status='cancelled';
        if(o.payment==='processing')o.payment='unpaid';
        if(o.payment==='paid'){o.payment='refunded';if(o.payWith==='vk')state.wallet.balance+=o.total;}
        save('Заказ отменён');
      }
      break;
    case 'advance-delivery':
    case 'rewind-delivery':
      if(changeDelivery(state,o,b.dataset.action==='rewind-delivery'?-1:1)){rewardReferral(o);save('Статус доставки обновлён');}
      break;
    case 'received':
      if(o?.status==='new'&&o.payment==='paid'){o.status='received';rewardReferral(o);save('Заказ отмечен полученным');}
      break;
    case 'external-pay':
      if(o?.method==='external'&&o.status!=='cancelled'){o.payment='paid';save('Поступление подтверждено');}
      break;
  }
});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form.dataset.caseForm){event.preventDefault();features.submit(form);return;}
  if(!form.dataset.form)return;
  event.preventDefault();
  if(await ecosystem.submit(form))return;
  const f=new FormData(form);
  const value=name=>String(f.get(name)||'').trim();
  if(form.dataset.form==='onboarding'){onboarding.submit(form,event.submitter);return;}
  if(['personal-message','client-search'].includes(form.dataset.form)){
    messenger.submit(form,render);
    return;
  }
  if(form.dataset.form.startsWith('community-')){
    community.submit(form.dataset.form.slice(10),form);
    if(form.closest('dialog')&&!form.querySelector(':invalid'))modal.close();
    return;
  }
  switch(form.dataset.form){
    case 'payment-method': {
      const o=state.orders.find(o=>o.id===+form.dataset.id);if(!o||o.status!=='new'||!['unpaid','failed'].includes(o.payment))return;
      if(value('method')==='vk'&&state.wallet.balance<o.total){saveMessage('Недостаточно демосредств. Пополните VK Pay или выберите карту.');return;}
      o.payWith=value('method')==='card'?'card':'vk';o.payment='processing';modal.close();save('Платёж обрабатывается');break;
    }
    case 'settings':
      state.settings={...state.settings,payment:f.has('payment'),delivery:f.has('delivery'),price:+value('price'),days:+value('days'),
        minimum:+value('minimum'),packingDays:+value('packingDays'),freeDelivery:f.has('freeDelivery'),policy:value('policy'),
        ozonDemoInitialized:true,deliveryMethods:Object.keys(deliveryMethods).filter(code=>f.has('method-'+code))};
      save('Настройки сохранены');
      break;
    case 'product': {
      if(!value('name')||!value('category')){form.querySelector('input').focus();return;}
      const id=+form.dataset.id;
      const modes=f.getAll('modes').filter(mode=>Object.hasOwn(purchaseLabels,mode));
      if(!modes.length){form.elements.modes[0].focus();saveMessage('Выберите хотя бы один способ покупки');return;}
      const externalUrl=ozonUrl({externalUrl:value('externalUrl')});
      if(modes.includes('external')&&!externalUrl){
        const field=form.elements.externalUrl;
        field.setCustomValidity('Укажите ссылку на товар на ozon.ru.');
        field.reportValidity();
        field.addEventListener('input',()=>field.setCustomValidity(''),{once:true});
        form.addEventListener('change',()=>field.setCustomValidity(''),{once:true});
        return;
      }
      const changes={...(form.dataset.attributes?{attributes:JSON.parse(form.dataset.attributes)}:{}),name:value('name'),category:value('category'),description:value('description'),modes,externalUrl,price:+value('price'),stock:+value('stock')};
      const p=state.products.find(p=>p.id===id);
      if(form.dataset.cover)changes.cover=form.dataset.cover;
      else if(f.get('photo')?.size){const file=f.get('photo');if(!file.type.startsWith('image/')||file.size>1500000){saveMessage('Для локального демо выберите фото до 1,5 МБ');return;}changes.cover=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});}
      if(p){const oldStock=p.stock;if(p.variants)changes.stock=p.stock;Object.assign(p,changes);ecosystem.restocked(p,oldStock);}
      else state.products.push({id:Math.max(0,...state.products.map(p=>p.id))+1,kind:'new',sellerId:'bishka',color:'#e9eff8',...changes});
      modal.close();
      save('Карточка сохранена');
      break;
    }
    case 'market-filters':
      if(value('min')&&value('max')&&Number(value('min'))>Number(value('max'))){
        saveMessage('Цена «от» не может быть больше цены «до»');
        form.elements.max.focus();
        break;
      }
      marketView.setFilters({min:value('min'),max:value('max'),available:f.has('available'),sort:value('sort'),days:value('days'),seller:value('seller')});
      const current=location.hash.slice(1).split('/')[0];
      const scope=['market-shop','market-saved','market-ozon'].includes(current)?current:'market';
      const route=scope+(value('category')?'/'+value('category'):'');
      if(location.hash==='#'+route){render();recordTrialImpressions();}else go(route);
      break;
    case 'search':
      marketQuery=value('query');
      if(marketQuery){state.case.queries=[marketQuery.slice(0,100),...state.case.queries.filter(q=>q!==marketQuery)].slice(0,12);localStorage.setItem(key,JSON.stringify(state));}
      if(/^#(?:market|market-shop|market-saved|market-ozon)(?:\/|$)/.test(location.hash)){render();recordTrialImpressions();}
      else go('market');
      break;
    case 'order-note': {
      const o=state.orders.find(o=>o.id===Number(form.dataset.id));
      if(o){o.label=value('label');o.note=value('note');save('Заметка сохранена');}
      break;
    }
    case 'order-search': orderSearch=value('query');orderStatus=value('status');render();break;
    case 'review': {
      const o=state.orders.find(o=>o.id===Number(form.dataset.id));
      const productId=+value('productId');
      if(!o?.demo||o.status!=='received'||o.payment!=='paid'||!(o.items||[{productId:o.productId}]).some(item=>item.productId===productId))break;
      const files=f.getAll('media').filter(file=>file.size);
      if(files.length>3||files.some(file=>file.size>1500000||!/^image\/|^video\//.test(file.type))){saveMessage('До 3 фото или видео по 1,5 МБ в локальном демо');return;}
      const media=await Promise.all(files.map(file=>new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve({type:file.type.startsWith('video')?'video':'image',url:r.result});r.readAsDataURL(file);})));
      const existing=state.reviews.find(r=>r.orderId===o.id&&r.productId===productId);
      if(existing)Object.assign(existing,{rating:+value('rating'),text:value('text'),media:media.length?media:existing.media||[]});
      else state.reviews.push({orderId:o.id,productId,rating:+value('rating'),text:value('text'),media});
      modal.close();save('Отзыв опубликован');break;
    }
    case 'accept-gift': {
      const order=state.orders.find(o=>o.id===Number(form.dataset.id));
      if(!order?.gift||order.gift.accepted||order.payment!=='paid'||order.status!=='new'||!value('address')||!(order.deliveryChoices?.length?order.deliveryChoices:[order.deliveryMethod]).includes(value('method')))return;
      Object.assign(order.gift,{accepted:true,variant:value('variant'),address:value('address'),method:value('method')});
      order.deliveryMethod=value('method');
      save('Подарок принят');
      break;
    }
    case 'checkout': {
      const gift=form.dataset.gift==='true';
      const fromCart=form.dataset.id==='cart';
      const [id,source,publication,trial]=form.dataset.id.split(':').map(Number);
      const p=state.products.find(p=>p.id===id);
      const items=fromCart?shop.vkCartItems():p?[itemFor(p,source,publication,trial)]:[];
      if(!items.length||!value('name')||(gift?!value('recipient')&&!value('profile'):!value('city'))){form.querySelector('input').focus();return;}
      const promo=shop.refreshQuote(form);
      for(const item of items)item.variant=value('variant-'+item.product.id);
      if(!gift){
        const phone=form.elements.phone;
        phone.setCustomValidity(/^[78][0-9]{10}$/.test(value('phone').replace(/[^0-9]/g,''))?'':'Укажите российский номер из 11 цифр');
      }
      if(!form.reportValidity())return;
      if(form.dataset.preview==='true'){
        modal.close();save('Проверка пройдена. Заказ не создан.');return;
      }
      try{
        if(gift&&!friends.some(x=>x.id===value('recipient'))&&!/^https:\/\/(?:www\.)?vk\.(?:com|ru)\/[a-zA-Z0-9_.]+\/?$/.test(value('profile')))throw Error('Выберите друга или укажите ссылку VK');
        const created=placeOrders(state,items,value('name'),gift?'':value('city'),value('method'),promo);
        for(const order of created){
          order.expectedAt=arrivalDate(order.days);
          if(!gift){
            order.phone=value('phone');
            order.address=value('address');
            if(value('method')==='ozon')order.pickupAddress=ozonPoints[Number(value('point'))];
          }
        }
        const order=created[0];
        if(order.promo==='DRUG10')state.case.invited=false;
        if(gift){const friend=friends.find(x=>x.id===value('recipient'));const profile=value('profile');if(!friend&&!/^https:\/\/(?:www\.)?vk\.(?:com|ru)\/[a-zA-Z0-9_.]+\/?$/.test(profile))throw Error('Выберите друга или укажите ссылку VK');order.gift={recipient:friend?.name||profile,recipientId:friend?.id||profile,accepted:false};}
        if(fromCart)state.cart=state.cart.filter(row=>row.mode==='external');
        modal.close();save('Заказ оформлен');go(created.length>1?'my-orders':'purchase/'+order.id);
      }catch(e){dialog('Не удалось оформить заказ','<p>'+esc(e.message)+'</p>');}
      break;
    }
  }
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.keyCode===229)return;
  const input=event.target;
  if(!input.matches('textarea[name="text"]'))return;
  const form=input.closest('form.chat-compose, form[data-form="community-message"]');
  if(!form)return;
  event.preventDefault();
  if(input.value.trim())form.requestSubmit();
});
document.addEventListener('input',event=>{
  const input=event.target;
  const form=input.closest('form');
  const hint=form?.querySelector('[data-category-hint]');
  if(hint&&['name','product','description','category'].includes(input.name)){
    const fields=form.elements;
    if(input.name==='category'){
      delete fields.category.dataset.auto;
    }else{
      const name=(fields.product||fields.name).value;
      const suggested=suggestCategory(name)||suggestCategory(fields.description.value);
      if(!fields.category.value||fields.category.dataset.auto===fields.category.value){
        fields.category.value=suggested;
        fields.category.dataset.auto=suggested;
      }
    }
    hint.textContent=fields.category.dataset.auto?'Категория по названию или описанию. Её можно изменить.':'';
  }
});

document.addEventListener('input',event=>{
  if(event.target.name==='phone')event.target.setCustomValidity('');
  const form=event.target.closest('form[data-form="checkout"]');
  if(form)shop.refreshQuote(form);
});
document.addEventListener('change',event=>{
  if(event.target.matches('form[data-form="review"] select[name="productId"]')){const form=event.target.form;const r=state.reviews.find(r=>r.orderId===+form.dataset.id&&r.productId===+event.target.value);form.elements.rating.value=r?.rating||5;form.elements.text.value=r?.text||'';}
  if(event.target.matches('.store-settings [name="delivery"]'))event.target.form.querySelector('.delivery-settings').hidden=!event.target.checked;
  const composer=event.target.closest('.publication-composer');
  if(composer){
    const clip=composer.elements.type.value==='clip';
    const video=composer.elements.video;
    video.closest('label').hidden=!clip;
    video.required=clip;
    video.disabled=!clip;
    const product=shop.findProduct(+composer.elements.product.value);
    const preview=composer.querySelector('.composer-preview');
    preview.hidden=!product;
    preview.innerHTML=product?`<div class="item">${productImage(product)}<span><strong>${esc(product.name)}</strong><small>${money(product.price)} · Прикреплённый товар</small></span></div>`:'';
  }
  if(event.target.matches('.cart-method')){
    const item=state.cart.find(row=>row.id===Number(event.target.dataset.id));
    const product=item&&shop.findProduct(item.id);
    const mode=event.target.value;
    if(product&&cartModes(product).includes(mode)){
      item.mode=mode;
      item.quantity=mode==='external'?1:Math.min(item.quantity,product.stock);
      save('Способ покупки изменён');
    }
    return;
  }
  if(event.target.id==='order-filter'){orderFilter=event.target.value;render();document.querySelector('#order-filter').focus();}
});
function recordPublicationViews(){
  const [route,section,detail]=(location.hash.slice(1)||'feed').split('/');
  if(!['community','feed'].includes(route))return;
  const enabled={post:state.community.posts,clip:state.community.clips,channel:state.community.channel};
  const type=route==='feed'?'post':section==='buyer'||section==='owner'?detail:section;
  for(const publication of state.publications){
    if(enabled[publication.type]&&(!type||type==='all'||publication.type===type)){
      record('view',publication.type==='clip'?channels[0]:channels[1],publication.id);
    }
  }
}
document.addEventListener('play',event=>{
  if(event.target.matches?.('.clip-player')&&!event.target.dataset.viewed){
    event.target.dataset.viewed='true';
    record('view',channels[0],Number(event.target.dataset.publication)||1);
  }
},true);
function recordTrialImpressions(){
  if(location.hash!=='#market')return;
  for(const {productId} of state.trials){
    const product=state.products.find(p=>p.id===productId);
    if(product?.stock&&marketMatch(product,marketQuery.trim(),state.settings))record('impression','Поиск Маркета',0,productId);
  }
}
window.addEventListener('hashchange',()=>{if(modal.open)modal.close();startShopChat();window.scrollTo(0,0);render();recordTrialImpressions();recordPublicationViews();});
window.addEventListener('storage',event=>{
  if(event.key!==key||!event.newValue)return;
  const next=JSON.parse(event.newValue);
  const changed=['orders','messages','products','reviews','questions','stockSubscriptions','wallet','notifications','botRules'].some(field=>JSON.stringify(state[field])!==JSON.stringify(next[field]));
  // Community views retain references to their own models.
  const {community,newCommunity,...rest}=next;
  for(const [model,updated] of [[state.community,community],[state.newCommunity,newCommunity]]){
    if(!updated)continue;
    for(const field of Object.keys(model))if(!Object.hasOwn(updated,field))delete model[field];
    Object.assign(model,updated);
  }
  if(rest.case){Object.assign(state.case,rest.case);delete rest.case;}
  Object.assign(state,rest);
  if(changed&&!document.activeElement?.closest('#app form'))render();
});
startShopChat();
render();
recordTrialImpressions();
recordPublicationViews();
