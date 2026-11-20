import {deliveryMethods} from './commerce.js?v=20261120-3';

export function deliveryStages(order){
  if(order.deliveryMethod==='pickup')return ['Заказ оформлен','Готовится к выдаче','Готов к выдаче','Получен'];
  return ['Заказ оформлен','Передан в доставку','Готов к получению','Получен'];
}

export function deliveryStep(order){
  return order.status==='received'?3:order.deliveryStep??0;
}

export function deliveryLabel(order){
  return deliveryMethods[order.deliveryMethod]||'Доставка';
}

export function orderConfirmation(order){
  return {
    thread:order.id, side:'seller', kind:'order-confirmation', at:order.createdAt,
    text:`Заказ № ${order.id} принят.\nТовары: ${order.product}.\nСтатус можно проверить в разделе «Маркет → Заказы». О ходе доставки сообщим в Мессенджере.`
  };
}

export function changeDelivery(state,order,direction=1){
  if(!order?.demo||!['new','received'].includes(order.status)||order.payment!=='paid'||(order.gift&&!order.gift.accepted))return false;
  const next=deliveryStep(order)+direction;
  const text=deliveryStages(order)[next];
  if(!text)return false;
  order.deliveryStep=next;
  order.status=next===3?'received':'new';
  state.messages.push({thread:order.id,side:'delivery',text:direction<0?'Магазин уточнил статус: '+text+'.':text,at:Date.now()});
  return true;
}
