import {deliveryDate,sellers} from './ecosystem.js?v=20261120-3';
import {marketMatch,purchaseModes,ozonUrl} from './commerce.js?v=20261120-3';
import {icon} from './icons.js';

const beiber = {
  id:1861870624,sellerId:'ozon',
  name:'BEIBER Спрей для полости рта, 20 мл',
  category:'Уход за полостью рта',
  price:308,
  oldPrice:700,
  rating:'4,7',
  reviewCount:24187,
  stock:1,
  kind:'beiber',
  mode:'external',
  externalUrl:'https://www.ozon.ru/product/beiber-sprey-dlya-polosti-rta-20-ml-1861870624/'
};

const ozonOffers = [
  [1298331979,'Керамическая миска для питомцев, 410 мл','Миски и поилки',890,'bowl','miska-keramicheskaya-410ml-dlya-domashnih-zhivotnyh-art-9109-dlya-koshek-i-sobak'],
  [5969139130,'Поводок-рулетка с фиксатором, 5 м','Поводки',990,'retractable','povodok-ruletka-dlya-sobak-5-m-avtomaticheskiy-s-fiksatorom'],
  [2834862591,'Оранжевый мяч с бубенчиком для собак','Игрушки для собак',420,'ball','myach-dlya-sobak-prochnyy-pryguchiy-myach-s-bubenchikom-vnutri-oranzhevyy-zhevatelnyy-gryzunok'],
  [3746529159,'Дорожная тканевая косметичка','Красота и уход',680,'pouch','kosmetichka-zhenskaya-malenkaya-tkanevaya-byuti-sumka-dorozhnaya-myagkaya-penal'],
  [2017718595,'Керамическая миска для мелких пород, 300 мл','Миски и поилки',790,'bowl-cloud','miska-dlya-koshek-i-sobak-melkih-porod-keramicheskaya']
];
export const partnerProducts = [beiber,...ozonOffers.map(([id,name,category,price,kind,slug])=>({
  id,name,category,price,kind,sellerId:'ozon',mode:'external',stock:1,
  externalUrl:'https://www.ozon.ru/product/'+slug+'-'+id+'/',
  description:'Условия покупки, характеристики и точная комплектация указаны в карточке на Ozon.'
}))];

const categories = [
  ['pets','Зоотовары','bag','green', p=>/собак|миск|поилк|поводк|амуниц/i.test(p.category)],
  ['home','Дом и интерьер','home','blue',p=>/Посуда|Дом и интерьер/.test(p.category)],
  ['beauty','Красота','spark','pink',p=>p.kind==='beiber'||/красот|уход|косметик/i.test(p.category)]
];

export function marketUI(state,{esc,link,btn,money,productImage,shop}){
  const catalog = ()=>[...state.products,...partnerProducts];
  const marketId = p=>[p.id,p.sourceIndex??3,0,state.trials.some(row=>row.productId===p.id)?p.id:0].join(':');
  let filters={min:'',max:'',available:false,sort:'',days:'',seller:''};
  function setFilters(values={}){filters={min:'',max:'',available:false,sort:'',days:'',seller:'',...values};}
  function favorite(p){
    const saved=state.saved.includes(p.id);
    return `<button type="button" class="heart ${saved?'selected-heart':''}" data-action="favorite" data-id="${p.id}" aria-pressed="${saved}" aria-label="${saved?'Убрать из избранного':'В избранное'}">${icon('heart',23)}</button>`;
  }
  const tabs = [['market','Все товары'],['market-ozon','Ozon'],['for-you','Для вас'],['authors','Подборки авторов'],['referrals','Пригласить друга'],['my-orders','Заказы'],['market-saved','Избранное'],['market-reviews','Отзывы'],['support','Поддержка']];
  function toolbar(page,arg,query){
    const count=state.cart.reduce((sum,row)=>sum+row.quantity,0);
    const selected=['market-item','market-shop'].includes(page)?'market':page==='purchase'?'my-orders':page;
    const catalogPage=['market-shop','market-ozon'].includes(page)?page:'market';
    return `<section class="card market-toolbar"  aria-label="VK Маркет">
      <div class="market-toolbar-row">
        <a class="market-catalog-link" href="#${catalogPage}" data-action="market-reset">${icon('menu',18)} Каталог</a>
        <form class="market-search" data-form="search">
          ${icon('search',18)}<input name="query" aria-label="Поиск в Маркете" placeholder="Поиск в Маркете" value="${esc(query)}">
          <button class="btn secondary" type="submit">Найти</button>
        </form>
        ${link('cart',icon('cart',20)+' Корзина'+(count?' <span class="market-count">'+count+'</span>':''),'market-cart-link')}
      </div>
      <nav class="market-categories" aria-label="Категории Маркета">
        ${categories.map(([key,label,glyph,color])=>`<a class="market-category" href="#${catalogPage}/${key}" data-action="market-reset" ${page===catalogPage&&arg===key?'aria-current="page"':''}><span class="market-category-icon ${color}">${icon(glyph,23)}</span>${label}</a>`).join('')}
      </nav>
    </section>
    <nav class="card market-tabs" aria-label="Разделы Маркета">
      ${tabs.map(([key,label])=>`<a href="#${key}" ${['market','market-ozon'].includes(key)?'data-action="market-reset"':''} ${key===selected?'aria-current="page"':''}>${label}</a>`).join('')}
      <span class="muted market-city">${icon('pin',17)} ${esc(state.community.city||'Москва')}</span>
    </nav>`;
  }
  function card(p){
    const id=marketId(p);
    const modes=purchaseModes(p);
    const partner=p.sellerId==='ozon';
    const open=children=>`<a class="market-card-open" href="#product/${p.id}/${id.split(':').slice(1).join(':')}" data-action="track-product" data-id="${id}">${children}</a>`;
    return `<article class="market-card">
      <div class="market-card-picture">
        ${favorite(p)}${open(productImage(p)+'<span class="sr-only">'+esc(p.name)+'</span>')}
        ${modes.includes('external')&&ozonUrl(p)?'<span class="market-ozon-badge">Ozon</span>':''}
        ${!modes.includes('external')&&state.trials.some(row=>row.productId===p.id)?'<span class="market-trial">Первые показы</span>':''}
        ${!p.stock?'<span class="market-stock">Нет в наличии</span>':''}
      </div>
      <div class="market-card-price"><strong>${money(p.price)}</strong>${p.oldPrice?'<del>'+money(p.oldPrice)+'</del>':''}${partner?'<small class="market-price-example">Пример цены</small>':''}</div>
      ${open('<span class="market-card-name">'+esc(p.name)+'</span>')}
      <div class="market-card-meta">${p.rating?'★ '+p.rating+' · '+p.reviewCount.toLocaleString('ru-RU')+' отзывов':esc(partner?'Ozon':(sellers[p.sellerId||'bishka']?.name||state.community.name))}</div>
      <div class="market-buy-actions">
        ${modes.includes('message')&&state.community.messages&&p.stock?btn('product-message','Написать продавцу','secondary full',id):''}
        ${p.stock&&modes.includes('vk')?btn('checkout','Купить сейчас','primary full',id):''}${shop.cartAction(p,id,true)}${p.stock?'<small class="delivery-date">'+(partner?'Цена и доставка на Ozon':'Ожидается '+deliveryDate(p,state))+'</small>':btn('stock-subscribe',state.stockSubscriptions.includes(p.id)?'Жду поступления':'Уведомить','secondary full',p.id)}

      </div>
    </article>`;
  }
  function shelf(title,products){
    return `<section class="card market-shelf">
      <div class="card-head"><h2>${title}</h2></div>
      ${products.length?`<div class="market-grid">${products.map(card).join('')}</div>`:'<p class="market-empty muted">Товары не найдены</p>'}
    </section>`;
  }
  function home(category,query,scope='all'){
    const filter=categories.find(([key])=>key===category);
    const matches=catalog().filter(p=>(scope!=='shop'||p.sellerId==='bishka')&&
      (scope!=='ozon'||p.sellerId==='ozon')&&(scope!=='saved'||state.saved.includes(p.id))&&(!filter||filter[4](p))&&marketMatch(p,query,state.settings)&&
      (scope==='ozon'||!filters.seller||p.sellerId===filters.seller)&&(!filters.days||purchaseModes(p).includes('vk')&&(p.deliveryDays??state.settings.days)<=Number(filters.days))&&(!filters.available||p.stock>0)&&(filters.min===''||p.price>=Number(filters.min))&&
      (filters.max===''||p.price<=Number(filters.max)));
    matches.sort((a,b)=>Number(state.trials.some(row=>row.productId===b.id))-Number(state.trials.some(row=>row.productId===a.id)));
    if(filters.sort)matches.sort((a,b)=>filters.sort==='asc'?a.price-b.price:b.price-a.price);
    const title=scope==='shop'?'Товары «'+esc(state.community.name)+'»':scope==='saved'?'Избранное':scope==='ozon'?'Товары Ozon':query?'Результаты поиска':filter?.[1]||'Все товары';
    return `<div class="market-catalog-layout"><aside class="card filter-sidebar"><h2>Фильтры</h2><form class="market-filters" data-form="market-filters">
      <label>Категория<select name="category"><option value="">Все категории</option>${categories.map(([key,title])=>`<option value="${key}" ${key===category?'selected':''}>${title}</option>`).join('')}</select></label>
      <fieldset><legend>Цена, ₽</legend><div class="price-range"><input type="number" aria-label="Цена от" placeholder="От" min="0" name="min" value="${esc(filters.min)}"><input type="number" aria-label="Цена до" placeholder="До" min="0" name="max" value="${esc(filters.max)}"></div></fieldset>
      <label>Ожидаемая доставка<select name="days"><option value="">Любой срок</option>${[2,3,5,7].map(n=>`<option value="${n}" ${filters.days===String(n)?'selected':''}>До ${n} дней</option>`).join('')}</select></label>
      ${scope==='shop'||scope==='ozon'?'':`<label>Магазин<select name="seller"><option value="">Все магазины</option>${Object.entries(sellers).map(([key,store])=>`<option value="${key}" ${filters.seller===key?'selected':''}>${store.name}</option>`).join('')}</select></label>`}
      <label>Сортировка<select name="sort"><option value="">По умолчанию</option><option value="asc" ${filters.sort==='asc'?'selected':''}>Сначала дешевле</option><option value="desc" ${filters.sort==='desc'?'selected':''}>Сначала дороже</option></select></label>
      <label class="check-row"><input type="checkbox" name="available" ${filters.available?'checked':''}>Только в наличии</label>
      <button class="btn primary full">Применить</button>${btn('market-clear-filters','Сбросить','secondary full')}
    </form></aside><div>${shelf(title+' <span class="muted">'+matches.length+'</span>',matches)}</div></div>`;
  }

  function reviews(){
    return `<section class="card market-shelf"><div class="card-head"><h2>Отзывы о покупках</h2></div>
      ${state.reviews.length?state.reviews.map(review=>{
        const p=catalog().find(p=>p.id===review.productId);
        return `<article class="message-row"><strong>${esc(p?.name||'Товар')}</strong><small>Оценка ${review.rating} из 5</small><p>${esc(review.text||'Оценка без комментария')}</p><div class="review-media">${(review.media||[]).map(m=>m.type==='video'?`<video controls src="${esc(m.url)}"></video>`:`<img src="${esc(m.url)}" alt="Фото покупателя">`).join('')}</div>${review.source?'<small>Источник: '+esc(review.source)+'</small>':''}</article>`;
      }).join(''):'<p class="market-empty muted">Здесь появятся отзывы о покупках ВКонтакте.</p>'}
    </section>`;
  }
  return {toolbar,home,reviews,favorite,setFilters,card};
}
