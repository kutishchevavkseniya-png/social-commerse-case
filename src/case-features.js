import {marketMatch,purchaseModes} from './commerce.js';

export function initCase(state){
  state.case ??= {recent:[],queries:[],waiting:[],bonus:0};
  const p=state.products.find(product=>product.kind==='poncho');
  if(p && !p.variants){
    p.variants={S:Math.floor(p.stock/3),M:p.stock-Math.floor(p.stock/3),L:0};
  }
}

export function caseFeatures(state,ui){
  const {esc,link,btn,money,save,go,card,record}=ui;
  const data=state.case;
  const purchases=()=>state.orders.filter(o=>o.demo);
  const paid=o=>['paid','refunded'].includes(o.payment);
  const own=o=>o.sellerId==='bishka';
  const featured=()=>state.products.filter(p=>p.stock&&purchaseModes(p).includes('vk')).slice(0,4);
  const poncho=()=>state.products.find(p=>p.kind==='poncho');
  const referralCode='DRUG10';
  const earlyShop=()=>Number(state.community.followers??130)<=800;
  const hero=(kicker,title,description,actions='')=>`<section class="case-hero"><p class="case-kicker">${kicker}</p><h1>${title}</h1><p>${description}</p><div class="actions">${actions}</div></section>`;
  const grid=products=>`<div class="market-grid">${products.map(card).join('')}</div>`;
  function recommended(){
    const scores=new Map();
    for(const id of [...data.recent,...state.saved,...state.saved]){
      const p=state.products.find(product=>product.id===id);
      if(p)scores.set(p.category,(scores.get(p.category)||0)+1);
    }
    return state.products.filter(p=>p.stock&&purchaseModes(p).includes('vk')).map(p=>({
      product:p,score:(scores.get(p.category)||0)+data.queries.filter(query=>marketMatch(p,query,state.settings)).length
    })).sort((a,b)=>b.score-a.score||(a.product.deliveryDays??state.settings.days)-(b.product.deliveryDays??state.settings.days)).slice(0,8).map(row=>row.product);
  }
  function dashboard(){
    const orders=purchases().filter(own);
    const first=orders.filter(paid).at(-1);
    const steps=[
      ['Витрина настроена',state.products.some(p=>p.stock&&purchaseModes(p).includes('vk')),'products'],
      ['Оплата и получение настроены',state.settings.payment&&state.settings.delivery,'settings'],
      ['Опубликован контент с товаром',state.publications.some(p=>p.product),'content'],
      ['Включены первые показы',state.trials.length>0,'content/3'],
      ['Получен первый оплаченный заказ',first,first?'order/'+first.id:'clips/1']
    ];
    const counts=['view','open','checkout'].map(type=>state.events.filter(e=>e.type===type).length);
    counts.push(orders.length,orders.filter(paid).length,orders.filter(o=>o.status==='received').length);
    return hero('VK Start','От витрины до первого заказа','Проверьте готовность магазина, откройте клип и проведите тестовую покупку.',
      link('clips/1','Посмотреть клип','btn white')+link('market','Открыть Маркет','btn white'))+
      `<section class="card"><div class="card-head"><h2>Запуск магазина</h2><strong>${steps.filter(([,done])=>done).length} из ${steps.length}</strong></div>
      <ol class="case-steps">${steps.map(([label,done,route])=>`<li><span>${done?'✓':'○'}</span>${link(route,label,'text-link')}</li>`).join('')}</ol>
      ${first?`<p>Первый заказ № ${first.id} · ${esc(first.source)} · ${money(first.total)}</p>`:!state.trials.length&&earlyShop()?btn('case-trial','Включить первые показы','primary'):''}
      </section><section class="card"><h2>Воронка демонстрации</h2><div class="case-funnel">${['Просмотры контента','Открытия карточек','Начало оформления','Созданные заказы','Подтверждённые оплаты','Полученные заказы'].map((label,i)=>`<div><strong>${counts[i]}</strong><span>${label}</span><small>${i&&counts[i-1]&&counts[i]<=counts[i-1]?Math.round(counts[i]/counts[i-1]*100)+'% от предыдущего счётчика':''}</small></div>`).join('')}</div>
      <p>Отменённые заказы · ${orders.filter(o=>o.status==='cancelled').length}</p></section>`;
  }
  function authors(){
    const views=state.events.filter(e=>e.source==='Подборка автора');
    const orders=purchases().filter(o=>o.items?.some(i=>i.source==='Подборка автора'));
    return hero('Подборка автора','Прогулка в любую погоду','Алина собрала товары для прогулок с собакой.')+
      `<section class="card"><h2>Товары из подборки</h2>${grid(featured().map(p=>({...p,sourceIndex:6})))}</section>
      <section class="card"><h2>Результаты подборки</h2><p>${views.filter(e=>e.type==='open').length} открытий карточек · ${orders.length} заказов · ${orders.filter(paid).length} оплат</p></section>`;
  }
  function referrals(){
    const order=purchases().find(o=>o.promo===referralCode);
    const url=new URL(location.href);url.hash='invite/'+referralCode;
    return hero('VK Маркет','Пригласить друга','Друг получает скидку 10% на первый заказ. После получения заказа у пригласившего появляется бонус.')+
      `<section class="card"><h2>Ссылка для друга</h2><input aria-label="Ссылка для друга" class="case-copy" readonly value="${esc(url.href)}">
      <div class="actions">${btn('case-copy','Скопировать','secondary')}${link('invite/'+referralCode,'Открыть как друг','btn primary')}</div>
      <p>${order?'Заказ друга № '+order.id+(data.referralReward?' · Бонус 300 ₽ начислен':' · Ожидаем получения'):'Приглашение ожидает первого заказа'}</p></section>`;
  }
  function invite(code){
    if(code!==referralCode)return '<section class="card">Приглашение не найдено</section>';
    return hero('Приглашение друга','Скидка 10% на первый заказ','Скидка применяется к одному тестовому заказу ВКонтакте.',btn('case-invite','Принять приглашение','white'));
  }
  function verification(){
    const statuses={pending:'На проверке',approved:'Продавец проверен',rejected:'Нужно подать заявку повторно'};
    return hero('Мой бизнес','Проверка продавца',statuses[data.verification]||'Подайте тестовую заявку для сообщества «Бишка».')+
      `<section class="card"><h2>Заявка магазина</h2><p>Используются вымышленные данные продавца.</p><div class="actions">${data.verification==='pending'?btn('case-verify','Подтвердить проверку','primary')+btn('case-reject','Отклонить','secondary'):data.verification==='approved'?link('product/1','Открыть карточку товара','btn primary'):btn('case-apply','Подать демозаявку','primary')}</div></section>`;
  }
  function stock(){
    const p=poncho();
    return `<section class="card"><h1>Остатки по размерам</h1>${p?`<p>${esc(p.name)}</p><form data-case-form="stock">${Object.entries(p.variants).map(([variant,count])=>`<label>Размер ${variant}<input name="${variant}" type="number" min="0" max="100000" step="1" required value="${count}"></label>`).join('')}<button class="btn primary">Сохранить остатки</button></form>`:'<p>Добавьте товар с размерами.</p>'}</section>`;
  }
  const tickets=()=>state.support.filter(row=>row.ticket);
  function operator(){
    return `<section class="card"><h1>Рабочее место поддержки</h1>${tickets().map(ticket=>`<article class="message-row"><h3>Обращение № ${ticket.ticket}</h3><p>${esc(ticket.context||'Общее обращение')}</p><p>${esc(ticket.text)}</p>
    ${ticket.answered?'<strong>Ответ отправлен</strong>':`<form data-case-form="reply" data-id="${ticket.ticket}"><label>Ответ покупателю<textarea name="answer" maxlength="900" required></textarea></label><button class="btn primary">Отправить ответ</button></form>`}</article>`).join('')||'<p>Открытых обращений пока нет.</p>'}</section>`;
  }
  function promotionProduct(){
    return recommended().find(p=>p.sellerId==='bishka')||featured().find(p=>p.sellerId==='bishka');
  }
  function advertising(){
    const product=promotionProduct();
    const campaign=data.campaign;
    return hero('Мой бизнес','Помощник по продвижению','Подберите аудиторию, запустите тестовую кампанию и посмотрите её показатели.')+
      `<section class="card"><h2>Рекомендация для магазина</h2><p>${product?esc(product.name)+' · Люди, которым интересна категория «'+esc(product.category)+'»':'Добавьте товар в наличии.'}</p>
      <p>Стартовый демобюджет · ${money(data.bonus?0:1500)}</p>
      ${campaign?`<p>Кампания запущена · бюджет ${money(campaign.budget)}</p><p>Заказов из рекламы · ${purchases().filter(o=>o.items?.some(i=>i.source==='Реклама')).length}</p><p>${campaign.impressions} показов · ${campaign.opens} открытий карточки</p>${btn('case-ad-visit','Показать тестовое объявление','secondary')}`:product?'<form data-case-form="campaign"><label>Бюджет кампании, ₽<input name="budget" type="number" min="100" max="1500" value="900" required></label><button class="btn primary">Запустить демокампанию</button></form>':''}
      </section>`;
  }
  function variantButtons(p){
    if(!p.variants)return '';
    return `<div class="case-variants"><strong>Размеры</strong>${Object.entries(p.variants).map(([variant,count])=>`<div><span>${esc(variant)} · ${count?count+' шт.':'нет в наличии'}</span>${count?'':btn('case-wait',data.waiting.includes(p.id+':'+variant)?'Отменить подписку':'Сообщить о поступлении','secondary',p.id+':'+variant)}</div>`).join('')}</div>`;
  }
  function action(name,id){
    if(!name.startsWith('case-'))return false;
    switch(name){
      case 'case-copy': {
        const input=document.querySelector('.case-copy');
        input.select();
        navigator.clipboard?.writeText(input.value).then(()=>ui.toast('Ссылка скопирована'),()=>ui.toast('Ссылка выделена для копирования'));
        break;
      }
      case 'case-invite':
        if(!purchases().some(o=>o.promo===referralCode)){data.invited=true;save('Приглашение принято');}
        go('market');break;
      case 'case-trial': {
        const product=featured().find(p=>!p.sellerId||p.sellerId==='bishka');
        if(product&&earlyShop()&&state.settings.payment&&state.settings.delivery&&!state.trials.some(t=>t.productId===product.id)){
          state.trials.push({productId:product.id});save('Первые показы включены');
        }
        break;
      }
      case 'case-apply': data.verification='pending';save('Демозаявка отправлена');break;
      case 'case-verify': if(data.verification==='pending'){data.verification='approved';save('Продавец проверен');}break;
      case 'case-reject': if(data.verification==='pending'){data.verification='rejected';save('Заявка отклонена');}break;
      case 'case-wait': {
        const [productId,variant]=id.split(':');
        if(state.products.find(p=>p.id===Number(productId))?.variants?.[variant]!==0)break;
        data.waiting=data.waiting.includes(id)?data.waiting.filter(key=>key!==id):[...data.waiting,id];
        save(data.waiting.includes(id)?'Подписка на размер оформлена':'Подписка отменена');break;
      }
      case 'case-sync': {
        const p=state.products.find(p=>p.sellerId==='bishka'&&!p.variants);
        if(p){
          p.deliveryPrice=p.deliveryPrice===149?199:149;
          p.deliveryDays=2;
          p.syncSource='Тестовая витрина партнёра';
          p.syncAt=Date.now();
          save('Условия доставки обновлены · '+p.name);
        }
        break;
      }
      case 'case-push': {
        const title='Тестовое уведомление о поступлении';
        state.notifications.unshift({title,text:'Доступно в центре уведомлений',route:'notifications'});
        save('Уведомление отправлено в демо');
        if(window.Notification?.permission==='granted')new Notification(title);
        break;
      }
      case 'case-ad-visit': {
        const p=state.products.find(p=>p.id===data.campaign?.productId);
        if(p){
          data.campaign.impressions++;data.campaign.opens++;
          record('open','Реклама',1);go('product/'+p.id+'/7:1:0');
        }
        break;
      }
    }
    return true;
  }
  function submit(form){
    const values=new FormData(form);
    switch(form.dataset.caseForm){
      case 'stock': {
        const p=poncho();if(!p)break;
        for(const variant of Object.keys(p.variants)){
          const before=p.variants[variant];
          const count=Number(values.get(variant));
          p.variants[variant]=count;
          const key=p.id+':'+variant;
          if(!before&&count&&data.waiting.includes(key)){
            data.waiting=data.waiting.filter(value=>value!==key);
            state.notifications.unshift({title:'Размер снова в наличии',text:p.name+' · '+variant,route:'product/'+p.id});
          }
        }
        p.stock=Object.values(p.variants).reduce((sum,count)=>sum+count,0);save('Остатки сохранены');break;
      }
      case 'reply': {
        const ticket=tickets().find(t=>t.ticket===Number(form.dataset.id));
        const text=String(values.get('answer')).trim();
        if(ticket&&!ticket.answered&&text){
          ticket.answered=true;state.support.push({operator:true,text:'Специалист · № '+ticket.ticket+'\n'+text});save('Ответ отправлен');
        }
        break;
      }
      case 'campaign': {
        const product=promotionProduct(),budget=Number(values.get('budget'));
        if(product&&!data.campaign&&Number.isInteger(budget)&&budget>=100&&budget<=1500){
          data.bonus=1500;data.campaign={productId:product.id,budget,impressions:0,opens:0};save('Демокампания запущена');
        }
        break;
      }
    }
  }
  return {action,submit,variantButtons,routes:{
    'vk-start':dashboard,'for-you':()=>hero('VK Маркет','Для вас','Подборка учитывает ваши просмотры, поиск и избранное.')+grid(recommended()),
    authors,referrals,invite,verification,'variant-stock':stock,operator,'ad-helper':advertising
  }};
}
