import {marketMatch,purchaseModes,ozonUrl} from './commerce.js';
import {icon} from './icons.js';

export const ozonSample = {
  id:1861870624,
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

const categories = [
  ['pets','Зоотовары','bag','green', p=>p.kind!=='beiber'],
  ['beauty','Красота','spark','pink',p=>p.kind==='beiber'],
  ['ozon','Товары с Ozon','box','blue',p=>purchaseModes(p).includes('external')&&ozonUrl(p)]
];

export function marketUI(state,{esc,link,btn,money,productImage,shop}){
  const catalog = ()=>[...state.products,ozonSample];
  const marketId = p=>[p.id,3,0,state.trials.some(row=>row.productId===p.id)?p.id:0].join(':');
  const categoryPath = key=>key==='ozon'?'market-ozon':'market/'+key;
  const tabs = [['market','Все товары'],['my-orders','Заказы'],['market-reviews','Отзывы']];
  function toolbar(page,arg,query){
    const count=state.cart.reduce((sum,row)=>sum+row.quantity,0);
    const selected=['market-ozon','market-item'].includes(page)?'market':page==='purchase'?'my-orders':page;
    return `<section class="card market-toolbar" aria-label="VK Маркет">
      <div class="market-toolbar-row">
        <a class="market-catalog-link" href="#market" data-action="market-reset">${icon('menu',18)} Каталог</a>
        <form class="market-search" data-form="search">
          ${icon('search',18)}<input name="query" aria-label="Поиск в Маркете" placeholder="Поиск в Маркете" value="${esc(query)}">
          <button class="btn secondary" type="submit">Найти</button>
        </form>
        ${link('cart',icon('cart',20)+' Корзина'+(count?' <span class="market-count">'+count+'</span>':''),'market-cart-link')}
      </div>
      <nav class="market-categories" aria-label="Категории Маркета">
        ${categories.map(([key,label,glyph,color])=>`<a class="market-category" href="#${categoryPath(key)}" data-action="market-reset" ${page==='market-ozon'&&key==='ozon'||page==='market'&&arg===key?'aria-current="page"':''}><span class="market-category-icon ${color}">${icon(glyph,23)}</span>${label}</a>`).join('')}
      </nav>
    </section>
    <nav class="card market-tabs" aria-label="Разделы Маркета">
      ${tabs.map(([key,label])=>`<a href="#${key}" ${key==='market'?'data-action="market-reset"':''} ${key===selected?'aria-current="page"':''}>${label}</a>`).join('')}
      <span class="muted market-city">${icon('pin',17)} ${esc(state.community.city||'Москва')}</span>
    </nav>`;
  }
  function card(p){
    const id=marketId(p);
    const modes=purchaseModes(p);
    const open=children=>p.id===ozonSample.id
      ?link('market-item/'+p.id,children,'market-card-open')
      :`<button type="button" class="market-card-open" data-action="open-product" data-id="${id}">${children}</button>`;
    return `<article class="market-card">
      <div class="market-card-picture">
        ${open(productImage(p)+'<span class="sr-only">'+esc(p.name)+'</span>')}
        ${modes.includes('external')&&ozonUrl(p)?'<span class="market-ozon-badge">Ozon</span>':''}
        ${!modes.includes('external')&&state.trials.some(row=>row.productId===p.id)?'<span class="market-trial">Первые показы</span>':''}
        ${!p.stock&&!modes.includes('external')?'<span class="market-stock">Нет в наличии</span>':''}
      </div>
      <div class="market-card-price"><strong>${money(p.price)}</strong>${p.oldPrice?'<del>'+money(p.oldPrice)+'</del>':''}</div>
      ${open('<span class="market-card-name">'+esc(p.name)+'</span>')}
      <div class="market-card-meta">${p.rating?'★ '+p.rating+' · '+p.reviewCount.toLocaleString('ru-RU')+' отзывов':esc(p.kind==='beiber'?'Ozon':state.community.name+' · '+shop.modeLabel(p))}</div>
      <div class="market-buy-actions">
        ${modes.includes('message')&&state.community.messages?btn('product-message','Написать продавцу','secondary full',id):''}
        ${shop.cartAction(p,id,true)}
      </div>
    </article>`;
  }
  function shelf(title,products){
    return `<section class="card market-shelf">
      <div class="card-head"><h2>${title}</h2></div>
      ${products.length?`<div class="market-grid">${products.map(card).join('')}</div>`:'<p class="market-empty muted">Товары не найдены</p>'}
    </section>`;
  }
  function home(category,query){
    const filter=categories.find(([key])=>key===category);
    const matches=catalog().filter(p=>(!filter||filter[4](p))&&marketMatch(p,query,state.settings));
    if(query||filter)return shelf(query?'Результаты поиска':filter[1],matches);
    return shelf('Все товары',matches);
  }
  function reviews(){
    return `<section class="card market-shelf"><div class="card-head"><h2>Отзывы о покупках</h2></div>
      ${state.reviews.length?state.reviews.map(review=>{
        const p=catalog().find(p=>p.id===review.productId);
        return `<article class="message-row"><strong>${esc(p?.name||'Товар')}</strong><small>Оценка ${review.rating} из 5</small><p>${esc(review.text)}</p></article>`;
      }).join(''):'<p class="market-empty muted">Здесь появятся отзывы о покупках ВКонтакте.</p>'}
    </section>`;
  }
  function detail(id){
    const p=ozonSample;
    if(Number(id)!==p.id)return shelf('Товар не найден',[]);
    return `<section class="card market-detail">
      <nav class="market-crumb" aria-label="Расположение товара">${link('market','Главная')} <span>›</span> ${link('market/beauty','Красота')} <span>›</span> <strong>${p.category}</strong></nav>
      <div class="market-detail-grid">
        <div class="market-detail-gallery">${productImage(p)}</div>
        <div class="market-detail-info">
          <div class="market-detail-price"><strong>${money(p.price)}</strong><del>${money(p.oldPrice)}</del></div>
          <span class="market-detail-label">${icon('box',16)} Заказ оформляется на Ozon</span>
          <h1>${esc(p.name)}</h1>
          <p class="market-rating"><span aria-hidden="true">★★★★★</span> <strong>${p.rating}</strong> · ${p.reviewCount.toLocaleString('ru-RU')} отзывов</p>
          <a class="btn primary full" href="${p.externalUrl}" target="_blank" rel="noopener noreferrer">Купить на Ozon ${icon('arrow',17)}</a>
          ${shop.cartAction(p,marketId(p),true)}
          <dl class="kv">
            <div><dt>Аромат</dt><dd>Сочный арбуз</dd></div>
            <div><dt>Объём</dt><dd>20 мл</dd></div>
            <div><dt>Артикул Ozon</dt><dd>${p.id}</dd></div>
          </dl>
          <a class="text-link" href="${p.externalUrl}#reviews" target="_blank" rel="noopener noreferrer">Отзывы, доставка и возврат на Ozon</a>
          <p class="muted market-disclaimer">Цена и отзывы показаны по примеру со скриншота. Актуальные данные доступны на Ozon.</p>
        </div>
      </div>
    </section>`;
  }
  return {toolbar,home,reviews,detail};
}
