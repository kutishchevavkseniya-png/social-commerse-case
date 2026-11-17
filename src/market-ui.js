import {marketMatch,purchaseModes,ozonUrl} from './commerce.js';
import {productInfo} from './product-info.js';
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
  ['pets','Зоотовары','bag','green', p=>/собак|миск|поилк|поводк|амуниц/i.test(p.category)],
  ['beauty','Красота','spark','pink',p=>p.kind==='beiber'||/красот|уход|косметик/i.test(p.category)]
];

export function marketUI(state,{esc,link,btn,money,productImage,shop}){
  const catalog = ()=>[...state.products,ozonSample];
  const marketId = p=>[p.id,3,0,state.trials.some(row=>row.productId===p.id)?p.id:0].join(':');
  let filters={min:'',max:'',available:false,sort:''};
  function setFilters(values={}){filters={min:'',max:'',available:false,sort:'',...values};}
  function favorite(p){
    const saved=state.saved.includes(p.id);
    return btn('favorite',saved?'В избранном':'В избранное','secondary favorite-action',p.id);
  }
  const tabs = [['market','Все товары'],['my-orders','Заказы'],['market-saved','Избранное'],['market-reviews','Отзывы']];
  function toolbar(page,arg,query){
    const count=state.cart.reduce((sum,row)=>sum+row.quantity,0);
    const selected=['market-ozon','market-item','market-shop'].includes(page)?'market':page==='purchase'?'my-orders':page;
    const catalogPage=page==='market-shop'?'market-shop':'market';
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
        ${!p.stock?'<span class="market-stock">Нет в наличии</span>':''}
      </div>
      <div class="market-card-price"><strong>${money(p.price)}</strong>${p.oldPrice?'<del>'+money(p.oldPrice)+'</del>':''}</div>
      ${open('<span class="market-card-name">'+esc(p.name)+'</span>')}
      <div class="market-card-meta">${p.rating?'★ '+p.rating+' · '+p.reviewCount.toLocaleString('ru-RU')+' отзывов':esc(p.kind==='beiber'?'Ozon':state.community.name+' · '+shop.modeLabel(p))}</div>
      <div class="market-buy-actions">
        ${modes.includes('message')&&state.community.messages&&p.stock?btn('product-message','Написать продавцу','secondary full',id):''}
        ${shop.cartAction(p,id,true)}
        ${favorite(p)}
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
    const matches=catalog().filter(p=>(scope!=='shop'||p.id!==ozonSample.id)&&
      (scope!=='saved'||state.saved.includes(p.id))&&(!filter||filter[4](p))&&marketMatch(p,query,state.settings)&&
      (!filters.available||p.stock>0)&&(filters.min===''||p.price>=Number(filters.min))&&
      (filters.max===''||p.price<=Number(filters.max)));
    if(filters.sort)matches.sort((a,b)=>filters.sort==='asc'?a.price-b.price:b.price-a.price);
    const title=scope==='shop'?'Товары «'+esc(state.community.name)+'»':scope==='saved'?'Избранное':query?'Результаты поиска':filter?.[1]||'Все товары';
    return `<section class="card"><form class="market-filters" data-form="market-filters">
      <label>Цена от, ₽<input type="number" min="0" name="min" value="${esc(filters.min)}"></label>
      <label>Цена до, ₽<input type="number" min="0" name="max" value="${esc(filters.max)}"></label>
      <label>Сортировка<select name="sort"><option value="">По умолчанию</option><option value="asc" ${filters.sort==='asc'?'selected':''}>Сначала дешевле</option><option value="desc" ${filters.sort==='desc'?'selected':''}>Сначала дороже</option></select></label>
      <label class="check-row"><input type="checkbox" name="available" ${filters.available?'checked':''}>В наличии</label>
      <div class="actions"><button class="btn primary">Применить</button>${btn('market-clear-filters','Сбросить')}</div>
    </form></section>`+shelf(title,matches);
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
          <div class="product-links">${btn('product-reviews','Отзывы', 'secondary',p.id)}${btn('product-terms','Оплата, доставка и возврат','secondary',p.id)}</div>
          ${favorite(p)}
          <p class="muted market-disclaimer">Цена и отзывы показаны по примеру со скриншота. Актуальные данные доступны на Ozon.</p>
        </div>
      </div>${productInfo(p,esc)}
    </section>`;
  }
  return {toolbar,home,reviews,detail,favorite,setFilters};
}
