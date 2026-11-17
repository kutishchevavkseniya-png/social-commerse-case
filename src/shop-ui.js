import {friends,sellers} from './ecosystem.js';
import {availableDelivery,deliveryMethods,quote,purchaseLabels,purchaseModes,cartModes,ozonUrl} from './commerce.js';

export function shopUI(state,{esc,btn,link,money,table,ozonSample}){
  const findProduct=id=>state.products.find(p=>p.id===id) || (id===ozonSample.id?ozonSample:null);
  const modeLabel=p=>purchaseModes(p).map(mode=>purchaseLabels[mode]).filter(Boolean).join(' · ');
  const buyable=p=>purchaseModes(p).includes('vk');
  const cartItems=()=>state.cart.map(item=>{
    const product=findProduct(item.id);
    return {...item,product,mode:item.mode||'vk'};
  }).filter(item=>item.product);
  const vkCartItems=()=>cartItems().filter(row=>row.mode==='vk');

  const cartAction=(p,id,full=false)=>{
    const css='secondary'+(full?' full':'');
    if(!cartModes(p).length)return '';
    if(state.cart.some(row=>row.id===p.id))return link('cart','В корзине','btn '+css);
    return btn('cart-add','В корзину',css,id);
  };

  function cart(){
    const items=cartItems();
    if(!items.length)return `<section class="card market-empty">
      <h2>В корзине пока ничего</h2><p class="muted">Добавьте товары из Маркета</p>
      ${link('market','В Маркет','btn primary')}
    </section>`;
    const vkItems=vkCartItems();
    const total=vkItems.reduce((sum,row)=>sum+row.product.price*row.quantity,0);
    const valid=vkItems.length&&vkItems.every(row=>buyable(row.product)&&row.product.stock>=row.quantity);
    return `<section class="card"><div class="card-head"><h2>Корзина</h2>${link('market','Вернуться в Маркет','text-link')}</div>
      ${table(['Товар','Где оформить','Количество','Цена',''],items.map(row=>{
        const {product,mode,id,quantity}=row;
        const choices=cartModes(product);
        const shopChoice=choices.length>1||(choices.length&&!choices.includes(mode))
          ?`<select class="cart-method" data-id="${id}" aria-label="Способ покупки — ${esc(product.name)}">${choices.includes(mode)?'':'<option value="" selected disabled>Выберите площадку</option>'}${choices.map(choice=>
              `<option value="${choice}" ${choice===mode?'selected':''}>${purchaseLabels[choice]}</option>`
            ).join('')}</select>`
          :purchaseLabels[mode];
        const available=choices.includes(mode)&&(mode!=='vk'||product.stock>=quantity);
        return [
          esc(product.name)+(available?'':'<small>Этот способ покупки сейчас недоступен</small>'),
          shopChoice,
          mode==='vk'?`<div class="quantity">${btn('cart-minus','−','secondary',id)} <strong>${quantity}</strong> ${btn('cart-plus','+','secondary',id)}</div>`:'На Ozon',
          money(product.price*(mode==='vk'?quantity:1))+(mode==='external'?'<small>Цена в каталоге</small>':''),
          `<div class="actions">${mode==='external'&&available?`<a class="btn secondary" href="${esc(ozonUrl(product))}" target="_blank" rel="noopener noreferrer">Купить на Ozon</a>`:''}
            ${btn('cart-remove','Убрать','secondary',id)}</div>`
        ];
      }))}
      ${vkItems.length?`<div class="cart-footer"><strong>Товары ВКонтакте на ${money(total)}</strong>${valid?btn('cart-checkout','Оформить ВКонтакте','primary'):''}</div>`:''}
    </section>`;
  }
  function checkoutForm(items,identifier,preview=false,gift=false){
    const subtotal=items.reduce((sum,row)=>sum+row.product.price*row.quantity,0);
    const groups=Object.entries(Object.groupBy(items,row=>row.product.sellerId||'bishka')).map(([id,rows])=>({name:sellers[id]?.name||'Магазин',subtotal:rows.reduce((sum,r)=>sum+r.product.price*r.quantity,0),days:Math.max(0,...rows.map(r=>r.product.deliveryDays||0)),fee:rows.some(r=>Number.isFinite(r.product.deliveryPrice))?Math.max(...rows.map(r=>r.product.deliveryPrice).filter(Number.isFinite)):null}));
    const methods=availableDelivery(state.settings).filter(code=>!gift||code!=='pickup');
    if(!methods.length)return '<p>Настройте способ доставки.</p>';
    return `<form data-form="checkout" data-id="${identifier}" data-subtotal="${subtotal}" data-groups="${esc(JSON.stringify(groups))}" data-preview="${preview}" data-gift="${gift}">
      ${preview?'<p class="muted">Проверка готовности. Заказ, оплата и статистика при проверке не изменятся.</p>':''}
      <label>Имя покупателя<input name="name" required maxlength="70" value="${preview?'Тестовый покупатель':''}"></label>
      ${gift?'<label>Кому подарить<select name="recipient"><option value="">Выбрать друга</option>'+friends.map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('')+'</select></label><label>Или ссылка на профиль друга<input name="profile" type="url" placeholder="https://vk.com/id…"></label><p class="muted">После оплаты подарок появится в демочате друга. Получатель распакует его, выберет вариант и доставку. Стоимость доставки оплачивается вами сейчас.</p>':`<label>Город доставки<input name="city" required maxlength="50" value="${esc(state.community.city||'Москва')}"></label>`}
      <label>Способ доставки<select name="method">${methods.map(code=>`<option value="${code}">${deliveryMethods[code]}</option>`).join('')}</select></label>
      <label>Промокод<input name="promo" maxlength="24" placeholder="BISHKA10"></label>
      <dl class="kv" data-summary aria-live="polite"></dl>
      <button class="btn primary full">${preview?'Завершить проверку':'Оформить заказ'}</button></form>`;
  }
  function refreshQuote(form){
    const code=form.elements.promo.value.trim().toUpperCase();
    const method=form.elements.method.value;
    const promo=state.promos.find(row=>row.active&&row.code===code);
    const subtotal=Number(form.dataset.subtotal);
    const groups=JSON.parse(form.dataset.groups||'[]');
    const quotes=groups.length?groups.map(group=>{const q=quote(state.settings,group.subtotal,method,promo);if(method!=='pickup'&&group.fee!==null){q.fee=group.fee;q.total=group.subtotal-q.discount+q.fee;}return {...q,name:group.name,days:method==='pickup'?q.days:Math.max(group.days,q.days)};}):[quote(state.settings,subtotal,method,promo)];
    const q={fee:quotes.reduce((n,q)=>n+q.fee,0),days:Math.max(...quotes.map(q=>q.days)),discount:quotes.reduce((n,q)=>n+q.discount,0),total:quotes.reduce((n,q)=>n+q.total,0)};
    form.elements.promo.setCustomValidity(code&&!promo?'Промокод не найден или больше не действует.':'');
    form.querySelector('[data-summary]').innerHTML=(groups.length>1?'<p class="muted">Для каждого магазина будет создан отдельный заказ. Доставка рассчитывается отдельно.</p>'+quotes.map(q=>'<div><dt>'+esc(q.name)+'</dt><dd>'+money(q.total)+' · '+q.days+' дн.</dd></div>').join(''):'')+`<div><dt>Товары</dt><dd>${money(subtotal)}</dd></div>
      <div><dt>${deliveryMethods[method]}${q.days?' · '+q.days+' дн.':''}</dt><dd>${money(q.fee)}</dd></div>
      ${method==='pickup'?`<div><dt>Пункт выдачи</dt><dd>${esc([state.community.address,state.community.city].filter(Boolean).join(', '))}</dd></div>`:''}
      ${q.discount?`<div><dt>Скидка</dt><dd>−${money(q.discount)}</dd></div>`:''}
      ${code&&!promo?'<div><dt>Промокод не действует</dt><dd>—</dd></div>':''}
      <div><dt><strong>Итого</strong></dt><dd>${money(q.total)}</dd></div>`;
    return promo;
  }
  return {cart,cartAction,vkCartItems,findProduct,buyable,modeLabel,checkoutForm,refreshQuote};
}
