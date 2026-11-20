export const deliveryMethods = {
  ozon:'ПВЗ Ozon · демо', courier:'Курьером', pickup:'Самовывоз', cdek:'СДЭК', post:'Почта России', boxberry:'Boxberry'
};
export const ozonPoints = ['Москва, ул. Арбат, 15','Москва, ул. Тверская, 8','Москва, Ленинградский проспект, 39'];
export const arrivalDate = days => new Date(Date.now()+days*86400000).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
export function availableDelivery(settings){
  return settings.delivery ? (settings.deliveryMethods ?? ['courier']).filter(code=>Object.hasOwn(deliveryMethods,code)) : [];
}
export function quote(settings, subtotal, method='courier', promo){
  const pickup=method==='pickup';
  const fee=pickup||settings.freeDelivery?0:Number(settings.price);
  const days=(pickup?0:Number(settings.days))+Number(settings.packingDays||0);
  const discount=promo?.active?Math.floor(subtotal*promo.percent/100):0;
  return {fee,days,discount,total:subtotal-discount+fee};
}
export function marketMatch(product,query,settings){
  const q=query.toLowerCase().replace(/ё/g,'е');
  const deadline=q.match(/(?:за|до)\s+(\d+)\s*(?:дней|дня|день|дн\.?)/)||q.match(/до\s+(понедельника|вторника|среды|четверга|пятницы|субботы|воскресенья)/);
  const withoutDeadline=deadline?q.replace(deadline[0],''):q;
  const budget=withoutDeadline.match(/(?:до|не дороже)\s*(\d[\d \u00a0\u202f]*)/);
  if(budget && product.price>Number(budget[1].replace(/\s/g,'')))return false;
  const weekdays=['понедельника','вторника','среды','четверга','пятницы','субботы','воскресенья'];
  const days=deadline?(Number.isFinite(+deadline[1])?+deadline[1]:weekdays.indexOf(deadline[1])):null;
  if(days!==null && (!purchaseModes(product).includes('vk')||!product.stock||
    !availableDelivery(settings).some(method=>method!=='pickup'&&quote(settings,0,method).days<=days)))return false;
  const words=withoutDeadline.replace(budget?.[0]||'','').match(/[а-яa-z0-9]+/g)||[];
  const text=[product.name,product.category,product.description].filter(Boolean).join(' ').toLowerCase().replace(/ё/g,'е');
  return words.filter(word=>!['для','с','в','доставкой','руб','до','и','за'].includes(word)).every(word=>text.includes(word));
}
export function suggestCategory(value){
  const words=value.toLowerCase().replace(/ё/g,'е').match(/[а-яa-z]+/g)||[];
  const rules=[
    ['Миски и поилки', ['мис','поил','кормуш']],
    ['Одежда для собак', ['понч','дождев','комбинез','куртк']],
    ['Поводки и амуниция', ['повод','ошейн','шлейк','амуниц']],
    ['Игрушки для собак', ['игруш','мяч','канат']],
    ['Солнцезащитные очки', ['очк','поляризац']],
    ['Посуда', ['круж','тарел','стак','чаш']],
    ['Уход за полостью рта', ['beiber','ополаскив','зубн']]
  ];
  for(const word of words){
    if(word.length<3)continue;
    const match=rules.find(([,terms])=>terms.some(term=>word.startsWith(term)||term.startsWith(word)));
    if(match)return match[0];
  }
  return '';
}

export const purchaseLabels = {vk:'ВКонтакте · VK Pay или карта',external:'На Ozon'};

export function purchaseModes(product){
  const modes=(product.modes ?? [product.mode || 'vk']).filter(mode=>mode==='vk'||mode==='external');
  return modes.length?modes:['vk'];
}

export function ozonUrl(product){
  try {
    const url=new URL(product.externalUrl);
    if(['http:','https:'].includes(url.protocol)&&/(^|\.)ozon\.ru$/i.test(url.hostname))return url.href;
  } catch {}
  return '';
}

export function cartModes(product){
  return product.stock>0?purchaseModes(product).filter(mode=>mode==='vk'||mode==='external'&&ozonUrl(product)):[];
}

export function productQuote(settings,items,method,promo){
 const subtotal=items.reduce((n,r)=>n+r.product.price*r.quantity,0),q=quote(settings,subtotal,method,promo);
 const fees=items.map(r=>r.product.deliveryPrice).filter(Number.isFinite);
 if(method!=='pickup'&&fees.length){q.fee=Math.max(...fees);q.total=subtotal-q.discount+q.fee;}
 if(method!=='pickup')q.days=Math.max(q.days,...items.map(r=>(r.product.deliveryDays||0)+Number(settings.packingDays||0)));
 return q;
}
