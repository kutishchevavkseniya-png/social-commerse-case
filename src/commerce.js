export const deliveryMethods = {
  courier:'Курьером', pickup:'Самовывоз', cdek:'СДЭК', post:'Почта России', boxberry:'Boxberry'
};
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
  if(/очк|поляризац/i.test(value))return 'Солнцезащитные очки';
  if(/пончо|дождевик|куртк/i.test(value))return 'Одежда для собак';
  if(/мис[коч]|поил/i.test(value))return 'Миски и поилки';
  if(/повод|ошейн|шлейк/i.test(value))return 'Поводки и амуниция';
  return '';
}

export const purchaseLabels = {vk:'ВКонтакте',message:'В сообщениях',external:'На Ozon'};

export function purchaseModes(product){
  return product.modes ?? [product.mode || 'vk'];
}

export function ozonUrl(product){
  try {
    const url=new URL(product.externalUrl);
    if(['http:','https:'].includes(url.protocol)&&/(^|\.)ozon\.ru$/i.test(url.hostname))return url.href;
  } catch {}
  return '';
}

export function cartModes(product){
  return purchaseModes(product).filter(mode=>mode==='vk'&&product.stock>0||mode==='external'&&ozonUrl(product));
}
