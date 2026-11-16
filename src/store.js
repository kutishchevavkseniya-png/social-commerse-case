import {availableDelivery, quote, purchaseModes} from './commerce.js';
export const channels=['VK Клипы','Лента','Шопсы','Поиск Маркета','Источник неизвестен','Сообщество','Несколько источников'];
export const products=[{id:1,name:'Пончо для корги',price:1990,color:'#d7e7fa',kind:'poncho',category:'Одежда для собак',stock:12},{id:2,name:'Миска керамическая',price:1290,color:'#efe4d8',kind:'bowl',category:'Миски и поилки',stock:8},{id:3,name:'Поводок для прогулок',price:890,color:'#e0eadc',kind:'lead',category:'Поводки',stock:16}];
export function initialState(){return {products:structuredClone(products),settings:{payment:false,delivery:false,price:199,days:3},saved:[],orders:Array.from({length:12},(_,i)=>({id:1040+i,name:['Анна Смирнова','Мария Иванова','Алексей Петров'][i%3],product:products[i%3].name,productId:i%3+1,total:products[i%3].price+199,source:channels[i%5],payment:i%4===0?'processing':i%3===0?'unpaid':'paid',status:i<5?'received':'new',date:`2026-11-${String(10+i%7).padStart(2,'0')}`,method:i%3===0?'external':'vk'}))};}
export function metrics(orders){return {count:orders.length,paid:orders.filter(o=>o.payment==='paid').length,amount:orders.reduce((n,o)=>n+o.total,0),revenue:orders.filter(o=>o.payment==='paid').reduce((n,o)=>n+o.total,0)}}

export function ready(s){return s.settings.payment&&availableDelivery(s.settings).length>0}
export function placeOrder(s, items, name, city, method, promo){
  if(!ready(s)||!availableDelivery(s.settings).includes(method))throw Error('Магазин ещё не готов принять заказ с этой доставкой');
  for(const {product,quantity} of items){
    if(!purchaseModes(product).includes('vk'))throw Error('Этот товар оформляется вне корзины');
    if(!Number.isInteger(quantity)||quantity<1||product.stock<quantity)throw Error('Проверьте остаток товара: '+product.name);
  }
  const subtotal=items.reduce((sum,row)=>sum+row.product.price*row.quantity,0);
  if(subtotal<Number(s.settings.minimum||0))throw Error('Не достигнута минимальная сумма товаров');
  const pricing=quote(s.settings,subtotal,method,promo);
  const sources=new Set(items.map(row=>row.source));
  const createdAt=Date.now();
  const order={
    id:Math.max(1040,...s.orders.map(o=>o.id))+1, name, city, demo:true,
    product:items.map(row=>row.product.name+(row.quantity>1?' × '+row.quantity:'')).join(', '),
    productId:items[0].product.id,
    items:items.map(row=>({productId:row.product.id,quantity:row.quantity,source:row.source,publication:row.publication,trial:row.trial,unitPrice:row.product.price})),
    total:pricing.total, delivery:pricing.fee, days:pricing.days, deliveryMethod:method,
    discount:pricing.discount, promo:promo?.code, pickupAddress:method==='pickup'?s.community.address:'',
    source:sources.size===1?items[0].source:'Несколько источников',
    payment:'unpaid',status:'new',date:new Date(createdAt).toISOString().slice(0,10),createdAt,method:'vk'
  };
  for(const row of items)row.product.stock-=row.quantity;
  s.orders.unshift(order);
  return order;
}
