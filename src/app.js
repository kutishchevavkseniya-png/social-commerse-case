import {initCommunity,communityUI} from './community.js';
import {shopUI} from './shop-ui.js';
import {marketUI,ozonSample} from './market-ui.js';
import {availableDelivery,deliveryMethods,marketMatch,suggestCategory,purchaseModes,purchaseLabels,ozonUrl,cartModes} from './commerce.js';
import {channels, initialState, metrics, ready, placeOrder} from './store.js';
import {advanceDelivery,deliveryStages,deliveryStep,deliveryLabel} from './delivery.js';
import {onboardingUI} from './onboarding.js';
import {messengerUI} from './messenger.js';
import {icon} from './icons.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
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
initCommunity(state);
let channel = 0;
let orderFilter = 'all';
let marketQuery = '';
const marketPages = new Set(['market','market-ozon','market-item','market-reviews','cart','my-orders']);
let toastTimer;
const businessSections = [
  {label:'Обзор',pages:{business:'Обзор'}},
  {label:'Переписки',pages:{clients:'Переписки с клиентами'}},
  {label:'Заказы',pages:{orders:'Заказы',payments:'Платежи'}},
  {label:'Ассортимент',pages:{products:'Товары',collections:'Подборки',services:'Услуги',promos:'Промокоды'}},
  {label:'Продвижение',pages:{content:'Контент и каналы',campaigns:'Реклама',comments:'Комментарии'}},
  {label:'Настройки',pages:{settings:'Оплата и доставка',manage:'Сообщество',integrations:'Интеграции',help:'Справка'}}
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
  localStorage.setItem(key,JSON.stringify(state));
  render();
  if(message)saveMessage(message);
}
function dialog(title,body){
  modal.setAttribute('aria-labelledby','dialog-title');
  modal.innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+title+'</h2><button type="button" class="close" aria-label="Закрыть" data-action="close">×</button></div>'+body;
  if(!modal.open) modal.showModal();
}
function table(headers,rows,empty='Здесь пока ничего нет'){
  return '<div class="table-wrap"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+
    (rows.length ? rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('') : '<tr><td colspan="'+headers.length+'">'+empty+'</td></tr>')+
    '</tbody></table></div>';
}
function productImage(p){
  if(p.kind==='beiber') return '<img src="/public/media/beiber-ozon.webp" alt="Спрей BEIBER «Сочный арбуз»">';
  if(p.kind==='poncho') return '<img src="/public/media/poncho.webp" alt="Собака в синем пончо">';
  return '<span class="product-icon" style="--product-bg:'+esc(p.color)+'">'+icon('box',30)+'</span>';
}
const onboarding=onboardingUI(state,{esc,link,money,save,go,btn,dialog,closeDialog:()=>modal.close()});
const community=communityUI(state,{esc,link,btn,money,badge,dialog,save,go,productImage,table,roleSwitch:onboarding.roleSwitch});
const messenger=messengerUI(state,{esc,money,save,go});
const shop=shopUI(state,{esc,link,btn,money,table,ozonSample});
const marketView=marketUI(state,{esc,link,btn,money,productImage,shop});
let orderSearch='';
let orderStatus='all';
const sourcedOrders=source=>state.orders.filter(order=>order.source===source||order.items?.some(item=>item.source===source));
function openCount(source){
  const idx=channels.indexOf(source);
  return [4,6].includes(idx)?null:([660,420,220,180][idx]||0)+state.events.filter(e=>e.source===source&&e.type==='open').length;
}
function record(type,source,publication=0,trial=0){
  state.events.push({type,source,publication,trial});
  localStorage.setItem(key,JSON.stringify(state));
}
function readiness(){
  const mode=state.settings.launchMode||'vk';
  const published=state.products.some(p=>p.stock>0&&purchaseModes(p).includes(mode));
  const steps=[['Товар для этого способа опубликован',published,'products']];
  if(mode==='vk')steps.push(['Настроена доставка',availableDelivery(state.settings).length>0,'settings'],['Подключена оплата',state.settings.payment,'settings']);
  if(mode==='message')steps.push(['Сообщения включены',state.community.messages,'manage/contact']);
  if(mode==='external')steps.push(['Добавлена ссылка на Ozon',state.products.some(p=>p.stock>0&&purchaseModes(p).includes('external')&&ozonUrl(p)),'integrations']);
  const next=steps.find(([,done])=>!done);
  const done=steps.filter(([,ok])=>ok).length;
  return '<section class="card readiness"><div class="card-head"><h2>Готовность магазина</h2>'+badge(done+' из '+steps.length,done===steps.length?'green':'blue')+'</div>'+
    '<label class="launch-mode">Как будете продавать <select id="launch-mode">'+[['vk','ВКонтакте'],['message','В сообщениях'],['external','На Ozon']].map(([code,label])=>'<option value="'+code+'" '+(mode===code?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
    '<div class="progress" aria-label="Выполнено '+done+' из '+steps.length+'"><span style="width:'+done/steps.length*100+'%"></span></div>'+
    steps.map(([label,ok,route])=>link(route,'<span class="step-icon '+(ok?'done':'')+'">'+(ok?icon('check',14):'')+'</span><span>'+label+'</span>'+icon('arrow',14),'step')).join('')+
    link(next?next[2]:'market',next?'Продолжить настройку':'Проверить как покупатель','btn primary full')+'</section>';
}
function chart(){
  const data=Array.from({length:7},(_,i)=>{
    const day=10+i;
    return {day,...metrics(state.orders.filter(o=>o.date==='2026-11-'+day))};
  });
  const max=Math.max(4,...data.map(d=>d.count));
  return '<div class="chart-legend"><span>Оформлено</span><span>Оплачено</span></div><div class="chart" aria-label="Заказы и оплаты за 10–16 ноября">'+
    data.map(d=>'<div class="chart-day"><div class="bars" title="'+d.day+' ноября: '+d.count+' оформлено, '+d.paid+' оплачено"><i style="height:'+d.count/max*100+'%"></i><i style="height:'+d.paid/max*100+'%"></i></div><span>'+d.day+' ноя</span></div>').join('')+'</div>';
}
function overview(){
  const m=metrics(state.orders);
  const stats=[['Оформлено заказов',fmt(m.count),'На сумму '+money(m.amount),'bag'],['Оплачено заказов',fmt(m.paid),'Из '+fmt(m.count)+' оформленных','check'],['Подтверждено оплат',money(m.revenue),'VK Pay и оплаты вне VK','card']];
  const shortcuts=[
    ['clients','Переписки с клиентами','Вопросы о товарах, услугах и заказах','chat'],
    ['orders','Заказы','Статусы, доставка и оплата','box'],
    ['products','Товары','Карточки, цены и остатки','bag']
  ];
  return '<section class="business-shortcuts" aria-label="Быстрый доступ">'+shortcuts.map(([path,label,hint,glyph])=>link(
    path,'<span class="business-shortcut-icon">'+icon(glyph,22)+'</span><span><strong>'+label+'</strong><small>'+hint+'</small></span>'+icon('arrow',16),'card business-shortcut'
  )).join('')+'</section><div class="metrics">'+stats.map(([label,value,note,glyph])=>'<section class="card metric"><div class="metric-label">'+label+'<span>'+icon(glyph,17)+'</span></div><strong>'+value+'</strong><small>'+note+'</small></section>').join('')+'</div>'+
    '<div class="overview-grid"><section class="card"><div class="card-head"><h2>Заказы и оплаты</h2><span class="muted">10–16 ноя</span></div>'+chart()+'</section>'+readiness()+'</div>'+
    '<section class="card callout"><span class="large-icon">'+icon('check',24)+'</span><div><h2>Обучение запуску магазина</h2><p>Настройте первый магазин и проверьте, как его увидит покупатель.</p></div>'+link('new-community/owner','Открыть обучение','btn secondary')+'</section>'+
    '<section class="card sources"><div class="card-head"><h2>Источники заказов</h2>'+link('content','Контент и каналы '+icon('arrow',14),'text-link')+'</div>'+
    '<div class="source-list">'+channels.map((c,i)=>{const count=state.orders.filter(o=>o.source===c).length;return link('content/'+i,'<span>'+c+'</span><span class="track"><i style="width:'+count/Math.max(1,m.count)*100+'%"></i></span><strong>'+count+'</strong>','source');}).join('')+'</div></section>';
}
function publicationDetail(source,index){
  if(![0,1].includes(index))return '';
  const rows=state.publications.filter(p=>index===0?p.type==='clip':p.type!=='clip');
  return '<section class="card"><div class="card-head"><h2>Статистика публикаций</h2>'+btn('community-compose','Создать публикацию')+'</div>'+
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
  const m=metrics(state.orders.filter(o=>o.source===source));
  const opens=openCount(source);
  return '<section class="card"><div class="card-head"><h2>Источники продаж</h2></div>'+table(['Канал','Открытия карточек','Заказы','Оплаты'],channels.map((c,i)=>{
    const row=metrics(state.orders.filter(o=>o.source===c));
    return [link('content/'+i,c,'text-link '+(i===channel?'selected':'')),openCount(c)===null?'—':fmt(openCount(c)),row.count,row.paid];
  }))+'</section><section class="card content-detail"><div class="card-head"><h2>'+source+'</h2>'+badge('Источник заказов','blue')+'</div>'+
  (channel===4?'<p class="muted">Заказы, для которых не удалось определить канал.</p>':'')+
  '<dl class="kv"><div><dt>Открытия карточек по каналу</dt><dd>'+(opens===null?'—':fmt(opens))+'</dd></div><div><dt>Заказы по каналу</dt><dd>'+m.count+'</dd></div><div><dt>Подтверждённые оплаты</dt><dd>'+money(m.revenue)+'</dd></div></dl></section>'+publicationDetail(source,channel)+retailTrials();
}
function products(){
  return '<section class="card"><div class="card-head"><h2>Карточки товаров <span class="muted">'+state.products.length+'</span></h2>'+btn('edit-product','Добавить товар','primary')+'</div>'+
  table(['Товар','Цена','Остаток','В Маркете',''],state.products.map(p=>[
    '<div class="item">'+productImage(p)+'<div><strong>'+esc(p.name)+'</strong><small>'+esc(p.category)+'</small></div></div>',money(p.price),p.stock+' шт.',
    badge(p.stock?'Виден':'Нет в наличии',p.stock?'green':''),'<div class="actions">'+btn('edit-product','Изменить','secondary',p.id)+btn('check-product','Проверить готовность','secondary',p.id)+'</div>']))+'</section>'+
    '<section class="card callout"><span class="large-icon">'+icon('eye',25)+'</span><div><h2>Проверьте путь до заказа</h2><p>Откройте витрину и посмотрите, какие условия увидит покупатель.</p></div>'+link('market','Открыть витрину','btn secondary')+'</section>';
}
function orders(){
  const all=state.orders.filter(o=>(orderFilter==='all'||o.payment===orderFilter)&&
    (orderStatus==='all'||o.status===orderStatus)&&String(o.id+' '+o.name+' '+o.product+' '+(o.label||'')).toLowerCase().includes(orderSearch.toLowerCase()));
  return '<section class="card"><div class="card-head"><h2>Все заказы <span class="muted">'+all.length+'</span></h2><select id="order-filter" aria-label="Статус оплаты">'+[['all','Все оплаты'],...Object.entries(statusText)].map(([k,v])=>'<option value="'+k+'" '+(orderFilter===k?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
    '<form class="search-form" data-form="order-search"><input aria-label="Поиск по заказам" name="query" placeholder="Номер, имя или товар" value="'+esc(orderSearch)+'"><select name="status" aria-label="Выполнение">'+[['all','Все статусы'],...Object.entries(orderText)].map(([k,v])=>'<option value="'+k+'" '+(orderStatus===k?'selected':'')+'>'+v+'</option>').join('')+'</select><button class="btn secondary">Найти</button></form>'+
    table(['Заказ','Источник','Сумма','Оплата','Выполнение'],all.map(o=>[link('order/'+o.id,'№ '+o.id,'text-link')+'<small>'+esc(o.name)+'</small>'+(o.label?badge(esc(o.label),'blue'):''),o.source,money(o.total),paymentBadge(o),badge(orderStatusLabel(o),o.status==='received'?'green':o.status==='cancelRequested'?'orange':'')]))+'</section>';
}
function payments(){
  const m=metrics(state.orders);
  return '<div class="metrics"><section class="card metric"><div class="metric-label">Сумма оформленных заказов</div><strong>'+money(m.amount)+'</strong></section><section class="card metric"><div class="metric-label">Подтверждённые оплаты</div><strong>'+money(m.revenue)+'</strong></section><section class="card metric"><div class="metric-label">Статус VK Pay</div><strong class="status-value">'+(state.settings.payment?'Подключён':'Не подключён')+'</strong>'+link('settings','Настроить','text-link')+'</section></div>'+
    '<section class="card"><div class="card-head"><h2>Платежи по заказам</h2></div>'+table(['Заказ','Способ','Сумма','Статус'],state.orders.map(o=>[link('order/'+o.id,'№ '+o.id,'text-link'),o.method==='vk'?'VK Pay':'Вне VK',money(o.total),paymentBadge(o)]))+'</section>';
}
function settings(){
  const config=state.settings;
  const check=(name,label,checked)=>'<label class="toggle-row"><span>'+label+'</span><input type="checkbox" name="'+name+'" '+(checked?'checked':'')+'></label>';
  return '<section class="card settings"><div class="card-head"><h2>Оплата и доставка</h2>'+badge(ready(state)?'Готов к заказам':'Требуется настройка',ready(state)?'green':'orange')+'</div>'+
    '<form data-form="settings"><h3>Онлайн-оплата</h3>'+check('payment','Принимать тестовую оплату через VK Pay',config.payment)+
    '<label>Минимальная сумма товаров, ₽<input name="minimum" type="number" min="0" max="100000" value="'+(config.minimum||0)+'"></label>'+
    '<h3>Способы доставки</h3>'+check('delivery','Включить доставку',config.delivery)+
    '<div class="field-grid">'+Object.entries(deliveryMethods).map(([code,label])=>check('method-'+code,label,(config.deliveryMethods??['courier']).includes(code))).join('')+'</div>'+
    check('freeDelivery','Доставка за счёт магазина',config.freeDelivery)+
    '<div class="field-grid"><label>Стоимость доставки, ₽<input name="price" required type="number" min="0" max="100000" value="'+config.price+'"></label><label>Срок доставки, дней<input name="days" required type="number" min="1" max="99" value="'+config.days+'"></label><label>Срок комплектации, дней<input name="packingDays" type="number" min="0" max="30" value="'+(config.packingDays||0)+'"></label></div>'+
    '<label>Условия оплаты, доставки и возврата<textarea name="policy" rows="3" maxlength="600">'+esc(config.policy||'')+'</textarea></label>'+
    '<button class="btn primary">Сохранить настройки</button></form></section>';
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
  const canAdvance=!buyer&&active&&order.status==='new'&&order.payment==='paid'&&(!order.gift||order.gift.accepted);
  return `<section class="card" id="tracking"><div class="card-head"><h2>Отслеживание</h2><span class="muted">${deliveryLabel(order)}</span></div>
    ${active?`<ol class="tracking-steps">${steps.map((step,index)=>`<li class="${index<=current?'done':''}" ${index===current?'aria-current="step"':''}>
      <span class="tracking-dot" aria-hidden="true">${index<current?icon('check',12):''}</span>${step}
    </li>`).join('')}</ol>`:`<p>${orderText[order.status]}</p>`}
    ${canAdvance?`<div class="actions">${btn('advance-delivery',steps[current+1],'primary',order.id)}<small>Демо-статус появится в Мессенджере покупателя.</small></div>`:''}
    ${buyer&&active&&!current&&order.payment!=='paid'?'<p class="muted">Статус обновится после оплаты и обработки заказа.</p>':''}
  </section>`;
}
function orderDetail(id,buyer){
  const o=state.orders.find(o=>o.id===id&&(!buyer||o.demo));
  if(!o)return '<section class="card">Заказ не найден.</section>';
  let actions=link((buyer?'inbox/order/':'clients/')+o.id,buyer?'Написать магазину':'Переписка с клиентом','btn secondary');
  if(buyer&&o.demo)actions+=link('inbox/delivery','Уведомления о доставке','btn secondary');
  if(buyer&&o.status==='received'&&o.payment==='paid'&&unreviewedItems(o).length)actions+=btn('write-review','Оставить отзыв','secondary',o.id);
  if(buyer && o.status==='new'){
    if(['unpaid','failed'].includes(o.payment)) actions+=btn('start-pay','Тестовая оплата','primary',o.id);
    if(o.payment==='processing') actions+=btn('resolve-pay','Завершить тестовую оплату','primary',o.id);
    actions+=btn('request-cancel','Запросить отмену','secondary',o.id);
  }
  if(!buyer && o.status==='cancelRequested') actions+=btn('approve-cancel','Подтвердить отмену','secondary',o.id);
  if(!buyer && !o.demo && o.status==='new' && o.payment==='paid' && (!o.gift||o.gift.accepted)) actions+=btn('received','Отметить полученным','primary',o.id);
  if(!buyer && o.method==='external' && o.status!=='cancelled' && o.payment!=='paid') actions+=btn('external-pay','Подтвердить оплату вне VK','secondary',o.id);
  if(buyer&&o.gift&&o.payment==='paid'&&o.status!=='cancelled'){
    actions+=link('gift/'+o.id,o.gift.accepted?'Посмотреть подарок':'Открыть подарок как получатель','btn primary');
  }
  return '<section class="card"><div class="card-head"><h2>Заказ № '+o.id+'</h2>'+badge(orderStatusLabel(o))+'</div><dl class="kv"><div><dt>Товар</dt><dd>'+esc(o.product)+'</dd></div><div><dt>Покупатель</dt><dd>'+esc(o.name)+'</dd></div><div><dt>Источник</dt><dd>'+o.source+'</dd></div>'+
    (o.city?'<div><dt>Доставка</dt><dd>'+esc(o.pickupAddress||o.city)+' · '+(deliveryMethods[o.deliveryMethod]||'Доставка')+' · '+o.days+' дн. · '+money(o.delivery)+'</dd></div>':'')+
    (o.gift?'<div><dt>Подарок для '+esc(o.gift.recipient)+'</dt><dd>'+(o.gift.accepted?'Принят · '+esc(o.gift.variant)+' · '+esc(o.gift.address):'Получатель ещё не указал адрес')+'</dd></div>':'')+
    (o.discount?'<div><dt>Промокод '+esc(o.promo)+'</dt><dd>−'+money(o.discount)+'</dd></div>':'')+
    '<div><dt>Сумма заказа</dt><dd>'+money(o.total)+'</dd></div><div><dt>Оплата</dt><dd>'+paymentBadge(o)+'</dd></div></dl>'+
    (buyer?'<p class="muted">Подтверждение и обновления статуса доступны в Мессенджере. Этот заказ можно снова открыть в разделе «Маркет → Заказы».</p>':'')+
    '<div class="actions">'+actions+'</div></section>'+
    (o.demo?tracking(o,buyer):'')+(buyer?'':'<section class="card"><div class="card-head"><h2>Заметка продавца</h2></div><form data-form="order-note" data-id="'+o.id+'"><label>Метка<input name="label" maxlength="35" value="'+esc(o.label||'')+'"></label><label>Внутренний комментарий<textarea name="note" rows="3" maxlength="500">'+esc(o.note||'')+'</textarea></label><button class="btn secondary">Сохранить заметку</button></form></section>');
}
function unreviewedItems(order){
  return (order.items||[{productId:order.productId}]).filter(item=>!state.reviews.some(row=>row.orderId===order.id&&row.productId===item.productId));
}
function giftView(id){
  const order=state.orders.find(o=>o.id===Number(id)&&o.gift&&o.payment==='paid'&&!['cancelled','cancelRequested'].includes(o.status));
  if(!order)return '<section class="card"><p>Подарок недоступен.</p></section>';
  const {gift}=order;
  return '<section class="card"><div class="card-head"><h2>Подарок для '+esc(gift.recipient)+'</h2>'+badge(gift.accepted?'Принят':'Оплачен','green')+'</div><p>'+esc(order.name)+' дарит вам «'+esc(order.product)+'».</p>'+
    (gift.accepted?'<p class="space-top">'+esc(gift.variant)+' · '+esc(gift.address)+'</p>':
      '<form class="space-top" data-form="accept-gift" data-id="'+order.id+'"><label>Вариант товара<select name="variant"><option>Стандартный</option><option>Маленький</option><option>Большой</option></select></label><label>Адрес получателя<input name="address" required maxlength="160" placeholder="Для демо укажите вымышленный адрес"></label><button class="btn primary">Принять подарок</button></form>')+'</section>';
}
function buyerOrders(){
  return '<section class="card"><div class="card-head"><h2>Мои заказы</h2></div>'+table(['Заказ','Товар','Сумма','Оплата','Выполнение'],state.orders.filter(o=>o.demo).map(o=>[link('purchase/'+o.id,'№ '+o.id,'text-link'),esc(o.product),money(o.total),paymentBadge(o),o.status==='new'?deliveryStages(o)[deliveryStep(o)]:orderText[o.status]]),'Оформите первый заказ на витрине.')+'</section>';
}
const nav = [['home','Моя страница'],['news','Лента','feed'],['chat','Мессенджер','inbox'],['people','Друзья'],['people','Сообщества','communities'],['music','Музыка'],['play','Видео'],['play','Клипы','clips'],['game','Игры'],['bag','Маркет','market'],['bag','Мой бизнес','business']];
const routes={...community.views,communities:onboarding.list,'new-community':onboarding.page,business:overview,inbox:messenger.inbox,clients:messenger.clients,content,products,orders,payments,settings,market:category=>marketView.home(category,marketQuery),'market-ozon':()=>marketView.home('ozon',marketQuery),'market-item':marketView.detail,
  'market-reviews':marketView.reviews,gift:giftView,cart:shop.cart,'my-orders':buyerOrders,order:id=>orderDetail(Number(id),false),purchase:id=>orderDetail(Number(id),true)};
function businessHeader(page){
  const current=page==='order'?'orders':page;
  const active=businessSections.find(section=>Object.hasOwn(section.pages,current));
  const subnav=Object.entries(active.pages);
  return `<section class="card mast business-mast">
    <div class="mast-row"><img class="shop-avatar" src="/public/media/community-avatar.webp" alt="">
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
  if(page==='overview')return 'business';
  if(['market-saved','compare'].includes(page))return 'market';
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
  const inBusiness=Object.hasOwn(businessTitles,page)||page==='order';
  const currentClip=page==='clips'?app.querySelector('.clip-player'):null;
  const previousClip=currentClip?.dataset.route===location.hash?currentClip:null;
  const playback=previousClip&&{time:previousClip.currentTime,paused:previousClip.paused,muted:previousClip.muted,viewed:previousClip.dataset.viewed};
  const body=routes[page](arg,detail);
  const activeNav=inBusiness?'business':inMarket?'market':['community','shop-services','new-community'].includes(page)?'communities':page;
  const header=inBusiness?businessHeader(page):inMarket?marketView.toolbar(page,arg,marketQuery):'';
  app.innerHTML='<header class="topbar"><div class="top-inner">'+link('feed','<img src="/public/media/vk.png" alt=""><span>ВКонтакте</span>','brand')+
    '<div class="global-search" aria-disabled="true">'+icon('search',18)+' Поиск</div><span class="top-bell" aria-hidden="true">'+icon('bell',21)+'</span><div class="top-end"><span class="demo">Демоверсия</span><span class="avatar mini" aria-label="Профиль демоверсии">А</span></div></div></header>'+
    '<div class="layout"><aside class="sidebar"><nav aria-label="Меню ВКонтакте">'+nav.map(([glyph,label,target])=>{
      if(!target)return '<span class="nav-item disabled" aria-disabled="true">'+icon(glyph,19)+'<span>'+label+'</span></span>';
      const className='nav-item'+(target==='business'?' business-entry':'')+(target===activeNav?' active':'');
      return '<a href="#'+target+'" aria-label="'+label+'" class="'+className+'" '+(target===activeNav?'aria-current="page"':'')+'>'+icon(glyph,19)+'<span>'+label+'</span></a>';
    }).join('')+'</nav><div class="nav-foot">Демо для VK Case Champ</div></aside>'+
    '<main>'+header+body+'</main></div>';
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
  const reviews=state.reviews.filter(row=>row.productId===p.id);
  const average=reviews.length?(reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length).toFixed(1).replace('.',','):'';
  dialog(esc(p.name),'<div class="product-dialog-img">'+productImage(p)+'</div><div class="card-head"><strong class="product-price">'+money(p.price)+'</strong>'+badge(p.stock?'В наличии':'Нет в наличии',p.stock?'green':'')+'</div>'+
    '<p class="muted">'+esc(state.community.name)+' · '+esc(p.category)+' · '+shop.modeLabel(p)+'</p><p class="preline">'+esc(p.description||'')+'</p>'+
    (shop.buyable(p)?'<p>'+ (ready(state)?'Доступно: '+availableDelivery(state.settings).map(code=>deliveryMethods[code]).join(', '):'Магазин ещё настраивает оплату и доставку.')+'</p>':'')+
    (state.settings.policy&&shop.buyable(p)?'<details class="help-item"><summary>Условия доставки и возврата</summary><p class="preline">'+esc(state.settings.policy)+'</p></details>':'')+
    '<div class="actions">'+(canBuy?btn('checkout','Купить ВКонтакте','primary',id)+(availableDelivery(state.settings).some(code=>code!=='pickup')?btn('gift-checkout','Подарить','secondary',id):''):'')+
    shop.cartAction(p,id)+
    (modes.includes('message')&&state.community.messages?btn('product-message','Написать продавцу','primary',id):'')+
    (external?'<a class="btn secondary" href="'+esc(external)+'" target="_blank" rel="noopener noreferrer">Купить на Ozon</a>':'')+'</div>'+
    '<div class="product-reviews"><h3>Отзывы'+(average?' · '+average:'')+'</h3>'+
    (external&&!shop.buyable(p)?'<a class="text-link" href="'+esc(external)+'" target="_blank" rel="noopener noreferrer">Читать отзывы на Ozon</a>':
      reviews.length?reviews.map(row=>'<p>'+badge(row.rating+' из 5','blue')+' '+badge('Покупка подтверждена','green')+'<br>'+esc(row.text)+'</p>').join(''):'<p class="muted">Пока нет отзывов</p>')+'</div>');
}
function editProduct(id){
  const p=state.products.find(p=>p.id===id);
  dialog(p?'Изменить товар':'Новый товар','<form data-form="product" data-id="'+(p?.id||'')+'"><label>Название<input name="name" required maxlength="70" value="'+esc(p?.name||'')+'"></label>'+
    '<label>Описание<textarea name="description" rows="2" maxlength="500">'+esc(p?.description||'')+'</textarea></label>'+
    '<label>Категория<input name="category" required maxlength="50" value="'+esc(p?.category||'')+'"></label>'+btn('suggest-category','Предложить категорию')+
    '<div class="field-grid"><label>Цена, ₽<input name="price" type="number" min="1" max="1000000" required value="'+(p?.price??'')+'"></label><label>Остаток, шт.<input name="stock" type="number" min="0" max="100000" required value="'+(p?.stock??'')+'"></label></div>'+
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
  shop.refreshQuote(modal.querySelector('form'));
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
    case 'open-product': if(p){record('open',channelName,publication,trial);productDialog(p,source,publication,trial);} break;
    case 'market-reset':
      if(!marketQuery)break;
      marketQuery='';
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
    case 'suggest-category': {
      const fields=modal.querySelector('form').elements;
      const category=suggestCategory(fields.name.value+' '+fields.description.value);
      if(category)fields.category.value=category;
      else { fields.category.placeholder='Введите категорию вручную';fields.category.focus(); }
      break;
    }
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
      if(o)dialog('Отзыв о покупке','<form data-form="review" data-id="'+id+'"><label>Товар<select name="productId">'+unreviewedItems(o).map(item=>'<option value="'+item.productId+'">'+esc(state.products.find(p=>p.id===item.productId)?.name||o.product)+'</option>').join('')+'</select></label><label>Оценка<select name="rating">'+[5,4,3,2,1].map(n=>'<option>'+n+'</option>').join('')+'</select></label><label>Отзыв<textarea name="text" rows="3" maxlength="600"></textarea></label><button class="btn primary">Опубликовать отзыв</button></form>');
      break;
    case 'start-pay':
      if(o?.status==='new'&&['unpaid','failed'].includes(o.payment)){o.payment='processing';save('Платёж обрабатывается');}
      break;
    case 'resolve-pay':
      if(o?.status==='new'&&o.payment==='processing')dialog('Результат тестовой оплаты','<p class="muted">Выберите результат для демонстрации статуса платежа.</p><div class="actions">'+btn('payment-paid','Подтверждена','primary',id)+btn('payment-failed','Не прошла','secondary',id)+'</div>');
      break;
    case 'payment-paid':
    case 'payment-failed':
      if(o?.status==='new'&&o.payment==='processing'){
        o.payment=b.dataset.action==='payment-paid'?'paid':'failed';
        if(o.gift&&o.payment==='paid')state.messages.push({thread:o.id,side:'seller',text:'Подарок оплачен. Получатель может принять его и указать адрес.',gift:o.id});
        modal.close();save(statusText[o.payment]);
      }
      break;
    case 'request-cancel':
      if(o?.status==='new'){o.status='cancelRequested';save('Запрос на отмену отправлен продавцу');}
      break;
    case 'approve-cancel':
      if(o?.status==='cancelRequested'){
        if(o.demo)for(const item of o.items||[{productId:o.productId,quantity:1}]){
          const product=state.products.find(product=>product.id===item.productId);
          if(product)product.stock+=item.quantity;
        }
        o.status='cancelled';
        if(o.payment==='processing')o.payment='unpaid';
        if(o.payment==='paid')o.payment='refunded';
        save('Заказ отменён');
      }
      break;
    case 'advance-delivery':
      if(advanceDelivery(state,o))save('Статус доставки обновлён');
      break;
    case 'received':
      if(o?.status==='new'&&o.payment==='paid'){o.status='received';save('Заказ отмечен полученным');}
      break;
    case 'external-pay':
      if(o?.method==='external'&&o.status!=='cancelled'){o.payment='paid';save('Поступление подтверждено');}
      break;
  }
});
document.addEventListener('submit',event=>{
  const form=event.target;
  if(!form.dataset.form)return;
  event.preventDefault();
  const f=new FormData(form);
  const value=name=>String(f.get(name)||'').trim();
  if(form.dataset.form==='onboarding'){onboarding.submit(form);return;}
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
    case 'settings':
      state.settings={...state.settings,payment:f.has('payment'),delivery:f.has('delivery'),price:+value('price'),days:+value('days'),
        minimum:+value('minimum'),packingDays:+value('packingDays'),freeDelivery:f.has('freeDelivery'),policy:value('policy'),
        deliveryMethods:Object.keys(deliveryMethods).filter(code=>f.has('method-'+code))};
      save('Настройки сохранены');
      go('business');
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
      const changes={name:value('name'),category:value('category'),description:value('description'),modes,externalUrl,price:+value('price'),stock:+value('stock')};
      const p=state.products.find(p=>p.id===id);
      if(p)Object.assign(p,changes);
      else state.products.push({id:Math.max(0,...state.products.map(p=>p.id))+1,kind:'new',color:'#e9eff8',...changes});
      modal.close();
      save('Карточка сохранена');
      break;
    }
    case 'search':
      marketQuery=value('query');
      if(['#market','#market-ozon'].includes(location.hash)){render();recordTrialImpressions();}
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
      if(!o?.demo||o.status!=='received'||o.payment!=='paid'||!unreviewedItems(o).some(item=>item.productId===productId))break;
      state.reviews.push({orderId:o.id,productId,rating:+value('rating'),text:value('text')});
      modal.close();save('Отзыв опубликован');break;
    }
    case 'accept-gift': {
      const order=state.orders.find(o=>o.id===Number(form.dataset.id));
      if(!order?.gift||order.gift.accepted||order.payment!=='paid'||order.status!=='new'||!value('address'))return;
      Object.assign(order.gift,{accepted:true,variant:value('variant'),address:value('address')});
      save('Подарок принят');
      break;
    }
    case 'checkout': {
      const gift=form.dataset.gift==='true';
      const fromCart=form.dataset.id==='cart';
      const [id,source,publication,trial]=form.dataset.id.split(':').map(Number);
      const p=state.products.find(p=>p.id===id);
      const items=fromCart?shop.vkCartItems():p?[itemFor(p,source,publication,trial)]:[];
      if(!items.length||!value('name')||(gift?!value('recipient'):!value('city'))){form.querySelector('input').focus();return;}
      const promo=shop.refreshQuote(form);
      if(!form.reportValidity())return;
      if(form.dataset.preview==='true'){
        modal.close();save('Проверка пройдена. Заказ не создан.');return;
      }
      try{
        const order=placeOrder(state,items,value('name'),gift?'':value('city'),value('method'),promo);
        if(gift)order.gift={recipient:value('recipient'),accepted:false};
        if(fromCart)state.cart=state.cart.filter(row=>row.mode==='external');
        modal.close();save('Заказ оформлен');go('purchase/'+order.id);
      }catch(e){dialog('Не удалось оформить заказ','<p>'+esc(e.message)+'</p>');}
      break;
    }
  }
});
document.addEventListener('input',event=>{
  const form=event.target.closest('form[data-form="checkout"]');
  if(form)shop.refreshQuote(form);
});
document.addEventListener('change',event=>{
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
  if(event.target.id==='launch-mode'){state.settings.launchMode=event.target.value;save();document.querySelector('#launch-mode').focus();}
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
    record('view',channels[0],1);
  }
},true);
function recordTrialImpressions(){
  if(location.hash!=='#market')return;
  for(const {productId} of state.trials){
    const product=state.products.find(p=>p.id===productId);
    if(product?.stock&&marketMatch(product,marketQuery.trim(),state.settings))record('impression','Поиск Маркета',0,productId);
  }
}
window.addEventListener('hashchange',()=>{if(modal.open)modal.close();render();recordTrialImpressions();recordPublicationViews();window.scrollTo(0,0);});
render();
recordTrialImpressions();
recordPublicationViews();
