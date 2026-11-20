import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,placeOrders} from '../src/store.js';
import {initCommunity} from '../src/community.js';
import {initEcosystem,ecosystemUI} from '../src/ecosystem.js';
import {purchaseModes,cartModes} from '../src/commerce.js';
function fresh(){const s=initialState();initCommunity(s);initEcosystem(s);return s;}
const item=(s,id)=>({product:s.products.find(p=>p.id===id),quantity:1,source:'Сообщество'});

test('catalog migration is idempotent and cannot enable ordering through messages',()=>{
 const s=fresh();const n=s.products.length;s.products[0].modes=['message'];initEcosystem(s);
 assert.equal(s.products.length,n);assert.deepEqual(purchaseModes(s.products[0]),['vk']);
 assert.deepEqual(purchaseModes({modes:['message','external']}),['external']);
 assert.deepEqual(cartModes({stock:0,modes:['vk']}),[]);
});
test('multiple seller checkout commits separate orders with their delivery terms',()=>{
 const s=fresh();const orders=placeOrders(s,[item(s,1),item(s,101)],'Тест','Москва','courier');
 assert.equal(orders.length,2);assert.deepEqual(orders.map(o=>o.sellerId),['bishka','lapki']);
 assert.equal(orders[0].total,2189);assert.equal(orders[1].total,1789);assert.equal(orders[1].days,4);
 assert.equal(s.products.find(p=>p.id===1).stock,11);assert.equal(s.products.find(p=>p.id===101).stock,8);
});
test('failure at a later seller leaves all stocks and orders untouched',()=>{
 const s=fresh(),before=structuredClone(s);const rows=[item(s,1),item(s,110)];
 assert.throws(()=>placeOrders(s,rows,'Тест','Москва','courier'),/остаток/);
 assert.deepEqual(s,before);
});

test('catalog import validates the entire batch before changing products',async()=>{
 const s=fresh();const before=structuredClone(s);const errors=[];
 const original=globalThis.FormData;globalThis.FormData=class{constructor(form){this.data=form.data;}get(k){return this.data[k];}};
 try{
  const ui=ecosystemUI(s,{findProduct:id=>s.products.find(p=>p.id===id),toast:x=>errors.push(x),save:()=>{}});
  await ui.submit({dataset:{form:'catalog-import'},data:{file:{size:100,text:async()=>JSON.stringify({products:[{id:1,price:1800,stock:20,deliveryDays:2},{id:2,price:-1,stock:3,deliveryDays:2}]})}}});
  assert.deepEqual(s,before);assert.match(errors[0],/Импорт не применён/);
 }finally{globalThis.FormData=original;}
});
test('catalog import preserves external review attribution and sends restock notice once',async()=>{
 const s=fresh();s.products[0].stock=0;s.stockSubscriptions.push(1);
 const original=globalThis.FormData;globalThis.FormData=class{constructor(form){this.data=form.data;}get(k){return this.data[k];}};globalThis.window={};
 try{
  const ui=ecosystemUI(s,{findProduct:id=>s.products.find(p=>p.id===id),toast:assert.fail,save:()=>{}});
  const form={dataset:{form:'catalog-import'},data:{file:{size:100,text:async()=>JSON.stringify({products:[{id:1,price:1800,stock:20,deliveryDays:2,syncSource:'Каталог продавца',reviews:[{rating:4,text:'Отзыв из источника',source:'Ozon',media:[{type:'video',url:'https://example.com/review.mp4'}]}]}]})}}};
  await ui.submit(form);await ui.submit(form);
  assert.equal(s.notifications.length,1);assert.equal(s.notifications[0].route,'product/1');
  assert.equal(s.reviews.length,1);assert.equal(s.reviews[0].source,'Ozon');assert.equal(s.reviews[0].media[0].type,'video');
  assert.equal(s.products[0].price,1800);
 }finally{globalThis.FormData=original;delete globalThis.window;}
});
test('synced shipping price is preserved in checkout instead of silently using shop defaults',()=>{
 const s=fresh();s.products[0].deliveryPrice=350;s.products[0].deliveryDays=6;
 const [o]=placeOrders(s,[item(s,1)],'Тест','Москва','courier');
 assert.equal(o.delivery,350);assert.equal(o.total,2340);assert.equal(o.days,6);
});

test('Ozon pickup reserves the chosen size and includes production time',()=>{
 const s=fresh();
 s.settings.deliveryMethods.push('ozon');
 s.settings.packingDays=2;
 s.products[0].deliveryDays=4;
 s.products[0].variants={M:12,L:0};
 const [order]=placeOrders(s,[{...item(s,1),variant:'M'}],'Тест','Москва','ozon');
 assert.equal(order.deliveryMethod,'ozon');
 assert.equal(order.days,6);
 assert.equal(order.items[0].variant,'M');
 assert.equal(s.products[0].variants.M,11);
 assert.equal(s.products[0].stock,11);
 const before=structuredClone(s);
 assert.throws(()=>placeOrders(s,[{...item(s,1),variant:'L'}],'Тест','Москва','ozon'),/размер закончился/);
 assert.deepEqual(s,before);
});

test('referral discounts a single seller order in a mixed basket',()=>{
 const s=fresh();
 const promo={code:'DRUG10',percent:10,active:true};
 const [first,second]=placeOrders(s,[item(s,1),item(s,101)],'Тест','Москва','courier',promo);
 assert.equal(first.discount,199);
 assert.equal(first.promo,promo.code);
 assert.equal(second.discount,0);
 assert.equal(second.promo,undefined);
});
