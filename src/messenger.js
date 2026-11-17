import {friends,sellers} from './ecosystem.js';
import {deliveryLabel,orderConfirmation} from './delivery.js';

const personalContacts = [
  {id:'alina', name:'Алина', color:'blue', text:'Привет! Во сколько встречаемся в субботу?'},
  {id:'misha', name:'Миша', color:'orange', text:'Скинь фото с прогулки, когда будет время.'}
];

export function messengerUI(state,{esc,money,save,go}){
  state.personalMessages ??= Object.fromEntries(personalContacts.map(person=>[
    person.id,[{outgoing:false,text:person.text}]
  ]));
  let clientQuery='';

  function composer(id,kind,label='Сообщение'){
    return `<form class="chat-compose" data-form="${kind}" data-id="${id}">
      <textarea name="text" aria-label="${label}" placeholder="${label}" rows="1" maxlength="900" required></textarea>
      <button class="btn primary">Отправить</button>
    </form>`;
  }

  function bubble(text,outgoing,label='',extra=''){
    return `<div class="bubble ${outgoing?'outgoing':''}">${label?`<small>${esc(label)}</small>`:''}<p class="preline">${esc(text)}</p>${extra}</div>`;
  }

  function layout({title,rows,active,heading,caption,thread,form='',search='',context=''}){
    return `<div class="chat-layout">
      <section class="card chat-list"><h2>${title}</h2>${search}
        <nav aria-label="${title}">${rows.map(row=>`<a href="#${row.href}" ${row.href===active?'aria-current="page"':''}>
          <span class="chat-avatar ${row.color||'blue'}" aria-hidden="true">${esc(row.name[0])}</span>
          <span class="chat-list-copy"><strong>${esc(row.name)}</strong><small>${esc(row.preview)}</small></span>
        </a>`).join('')||'<p class="chat-empty muted">Диалоги не найдены.</p>'}</nav>
      </section>
      <section class="card chat-detail">
        <header class="chat-heading"><div><h2>${esc(heading)}</h2><p class="muted">${esc(caption)}</p></div>${context}</header>
        <div class="thread chat-history" aria-label="История переписки">${thread}</div>${form}
      </section>
    </div>`;
  }

  function tabs(active){
    return `<section class="card mast messenger-mast"><div class="mast-row"><div class="mast-copy"><h1>Мессенджер</h1></div></div>
      <nav class="tabs" aria-label="Разделы мессенджера">
        <a href="#inbox" ${active==='personal'?'aria-current="page"':''}>Личные</a>
        <a href="#inbox/purchases" ${active==='purchases'?'aria-current="page"':''}>Покупки</a>
        <a href="#inbox/gifts" ${active==='gifts'?'aria-current="page"':''}>Подарки</a>
        <a href="#inbox/delivery" ${active==='delivery'?'aria-current="page"':''}>Уведомления о доставке</a>
      </nav></section>`;
  }

  function personal(id){
    const person=personalContacts.find(contact=>contact.id===id);
    const url=contact=>'inbox/personal/'+contact.id;
    const rows=personalContacts.map(contact=>({
      ...contact,href:url(contact),preview:state.orders.some(o=>o.gift?.recipientId===contact.id&&o.payment==='paid')?'🎁 Подарок':state.personalMessages[contact.id].at(-1)?.text||'Личный диалог'
    }));
    return tabs('personal')+layout({
      title:'Личные диалоги',rows,active:person&&url(person),heading:person?.name||'Выберите диалог',caption:person?'Личная переписка':'',
      thread:person?state.personalMessages[person.id].map(message=>bubble(message.text,message.outgoing)).join('')+giftCards(person.id):'<p class="chat-empty muted">Откройте переписку из списка слева.</p>',
      form:person?composer(person.id,'personal-message'):''
    });
  }


  function giftCards(friend){
    return state.orders.filter(o=>o.gift&&o.payment==='paid'&&!['cancelled','cancelRequested'].includes(o.status)&&(!friend||o.gift.recipientId===friend)).map(o=>`<article class="gift-message"><span>🎁</span><strong>Подарок для ${esc(o.gift.recipient)}</strong><p>${esc(o.name)} дарит вам товар. Распакуйте подарок и выберите доставку.</p><a class="btn primary" href="#gift/${o.id}">${o.gift.accepted?'Посмотреть подарок':'Распаковать подарок'}</a><small>Демонстрация сообщения получателю</small></article>`).join('');
  }
  function reviewPrompt(order){
    if(!order?.demo||order.status!=='received'||order.payment!=='paid')return '';
    const todo=(order.items||[{productId:order.productId}]).some(i=>!state.reviews.some(r=>r.orderId===order.id&&r.productId===i.productId));
    return todo?`<div class="bubble"><strong>Как вам покупка?</strong><p>Заказ завершён. Поставьте оценку — текст необязателен.</p><div class="quick-rating">${[1,2,3,4,5].map(n=>`<button class="btn secondary" data-action="quick-review" data-id="${order.id}:${n}">${n} ★</button>`).join('')}</div></div>`:'';
  }

  function shopChat(seller,id){
    const orders=state.orders.filter(order=>seller?(!order.sellerId||order.sellerId==='bishka'):order.demo);
    const storeName=state.community.name;
    const path=thread=>seller?'clients/'+thread:thread?'inbox/order/'+thread:'inbox/shop';
    const threads=new Map([[0,[]],...orders.filter(order=>order.demo).map(order=>[order.id,[orderConfirmation(order)]])]);
    for(const message of state.messages){
      if(!threads.has(message.thread))threads.set(message.thread,[]);
      threads.get(message.thread).push(message);
    }
    const general={
      id:0,name:seller?'Покупатель':storeName,href:path(0),
      preview:threads.get(0).at(-1)?.text||(seller?'Вопросы о товарах и услугах':'Диалог с магазином')
    };
    const hasGeneral=state.shopChatStarted||threads.get(0).length>0;
    const all=[...orders.map(order=>({
      id:order.id, name:seller?order.name:sellers[order.sellerId||'bishka']?.name||storeName, href:path(order.id),
      preview:'Заказ № '+order.id+' · '+order.product,
      order
    })),...(hasGeneral?[general]:[])];
    const activity=row=>threads.get(row.id)?.at(-1)?.at||row.order?.createdAt||0;
    const recent=(a,b)=>activity(b)-activity(a);
    const entries=seller?all.filter(row=>[row.name,row.preview].join(' ').toLowerCase().includes(clientQuery.toLowerCase()))
      .sort(recent):all.sort(recent);
    const selected=id===undefined?entries[0]:all.find(row=>row.id===Number(id));
    const order=selected?.order;
    const messages=selected?(threads.get(selected.id)||[]):[];
    const search=seller?`<form class="chat-search" data-form="client-search">
      <input name="query" aria-label="Поиск по клиентам" placeholder="Имя, заказ или товар" value="${esc(clientQuery)}">
      <button class="btn secondary">Найти</button>
    </form>`:'';

    return (seller?'':tabs('purchases'))+layout({
      title:seller?'Переписки с клиентами':'Переписки с магазинами',
      rows:entries,active:selected?.href,search,heading:selected?.name||'Выберите переписку',
      caption:order?'Заказ № '+order.id:selected?(seller?'Обращения в магазин':'Сообщения сообщества'):'',
      context:order?`<a href="#${seller?'order':'purchase'}/${order.id}" class="btn secondary">Открыть заказ</a>`:'',
      thread:messages.length?messages.map(message=>bubble(
        message.text,message.side===(seller?'seller':'buyer'),message.side==='delivery'?deliveryLabel(order):message.side==='seller'?storeName:seller?selected.name:'Вы',
        !seller&&(message.side==='delivery'||message.kind==='order-confirmation')?`<a href="#purchase/${order.id}" class="text-link">Отследить заказ</a>`:!seller&&message.gift?`<a href="#gift/${message.gift}" class="text-link">Открыть подарок</a>`:''
      )).join(''):`<p class="chat-empty muted">${selected&&!seller&&!order&&state.community.messages?esc(state.community.greeting):selected?'Здесь появятся сообщения.':'Переписка появится после обращения к продавцу или оформления заказа.'}</p>`,
      form:(!seller?reviewPrompt(order):'')+(selected&&(seller||state.community.messages)?composer(
        selected.id+':'+(seller?'seller':'buyer'),'community-message',seller?'Ответ клиенту':'Сообщение магазину'
      ):selected?'<p class="chat-empty muted">Магазин отключил приём сообщений.</p>':'')
    });
  }

  function deliveryInbox(){
    const orders=new Map(state.orders.filter(order=>order.demo).map(order=>[order.id,order]));
    const updates=[...orders.values()].map(order=>({
      thread:order.id, kind:'order-confirmation', at:order.createdAt,
      text:`Магазин принял заказ. Здесь появятся следующие обновления.`
    })).concat(state.messages.filter(message=>message.side==='delivery'&&orders.has(message.thread)).reverse())
      .sort((a,b)=>(b.at||0)-(a.at||0));
    return tabs('delivery')+`<section class="card"><div class="card-head"><h2>Уведомления о доставке</h2></div>
      ${updates.length?updates.map(message=>{
        const order=orders.get(message.thread);
        const sender=message.kind==='order-confirmation'?state.community.name:deliveryLabel(order);
        return `<article class="message-row delivery-update"><div><strong>${esc(sender)} · Заказ № ${order.id}</strong>
          ${message.at?`<small>${new Date(message.at).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'})}</small>`:''}
          <p>${esc(message.text)}</p></div><a href="#purchase/${order.id}" class="btn secondary">Отследить заказ</a></article>`;
      }).join(''):'<p class="chat-empty muted">Здесь появятся обновления статусов ваших заказов.</p>'}
    </section>`;
  }

  function inbox(section,id){
    if(section==='gifts')return tabs('gifts')+'<section class="card"><h2>Подарки друзьям</h2>'+ (giftCards()||'<p class="empty-note">Здесь появятся подарки после оплаты.</p>')+'</section>';
    if(section==='delivery')return deliveryInbox();
    if(section==='order')return shopChat(false,id);
    if(section==='shop')return shopChat(false,0);
    if(section==='purchases')return shopChat(false);
    return personal(id);
  }

  function submit(form,render){
    const value=String(new FormData(form).get(form.dataset.form==='client-search'?'query':'text')||'').trim();
    if(form.dataset.form==='client-search'){
      clientQuery=value;
      if(location.hash==='#clients')render();
      else go('clients');
      return;
    }
    const messages=state.personalMessages[form.dataset.id];
    if(!value||!Array.isArray(messages))return;
    messages.push({outgoing:true,text:value});
    save('Сообщение отправлено');
  }

  return {inbox,clients:id=>shopChat(true,id),submit};
}
