const fieldHints = {
  name:'Введите название, которое увидят покупатели.',
  description:'Коротко расскажите, что вы продаёте. Описание появится на странице сообщества.',
  product:'Введите название товара, по которому его можно будет найти в Маркете.',
  category:'Укажите категорию товара. Можно выбрать подсказку из списка.',
  price:'Введите цену за одну штуку.',
  stock:'Укажите, сколько единиц товара есть в наличии.',
  mode:'Выберите, как покупатель будет оформлять заказ из карточки.',
  recipient:'Для обучения подойдёт вымышленное имя получателя.',
  method:'Выберите, как покупатель получит товар.',
  fee:'Укажите стоимость доставки, которую увидит покупатель.',
  days:'Укажите срок доставки в днях.',
  address:'Введите адрес, по которому покупатель заберёт заказ.',
  format:'Выберите пост или клип. Этот формат отобразится как источник заказа.',
  title:'Дайте публикации короткий заголовок.',
  query:'Введите название или категорию товара и проверьте выдачу.',
  buyer:'Проверьте имя покупателя перед оформлением пробного заказа.',
  result:'Выберите исход тестового платежа. При отказе оплату можно повторить.',
  source:'Сверьте ответ со строкой «Заказы и оплаты» выше.',
  text:'Напишите текст, который увидит покупатель.'
};

const actionHints = {
  connect:'Включите тестовую оплату, чтобы открыть оформление заказа.',
  publish:'Опубликуйте запись. В неё добавится ссылка на товар.',
  preview:'Создайте пробный заказ. После этого он появится у продавца.',
  'test-pay':'Нажмите, чтобы начать тестовую оплату.',
  'payment-result':'Подтвердите выбранный результат оплаты.',
  visibility:'Проверьте, находится ли карточка по этому запросу.',
  report:'Проверьте ответ и завершите обучение.'
};

export function lessonSpotlight(app){
  const overlay=document.createElement('div');
  overlay.className='lesson-spotlight';
  overlay.hidden=true;
  overlay.innerHTML=`
    <div class="lesson-spotlight-hole" aria-hidden="true"></div>
    <div class="lesson-callout">
      <div class="lesson-callout-copy" id="lesson-callout-copy" aria-live="polite"></div>
      <button type="button" class="lesson-dismiss" aria-label="Скрыть подсказки" title="Скрыть подсказки">×</button>
      <button type="button" class="lesson-continue">Далее</button>
      <svg class="lesson-pointer" width="31" height="32" viewBox="0 0 31 32" aria-hidden="true" focusable="false"><path d="M3 3q18 2 19 22m-7-6 7 8 6-9" fill="none" stroke="currentColor" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>`;
  document.body.append(overlay);
  const hole=overlay.querySelector('.lesson-spotlight-hole');
  const callout=overlay.querySelector('.lesson-callout');
  const copy=overlay.querySelector('.lesson-callout-copy');
  const dismiss=overlay.querySelector('.lesson-dismiss');
  const advance=overlay.querySelector('.lesson-continue');
  let enabled=true;
  let target;
  let form;
  let frame=0;
  const viewport=window.visualViewport;
  const observer=new ResizeObserver(queue);
  observer.observe(callout);

  function fields(){
    if(!form)return [];
    return [...form.elements].filter(field=>{
      if(field.disabled||field.hidden)return false;
      if(field.name==='address'&&form.elements.method?.value!=='pickup')return false;
      return field.matches('input:not([type="hidden"]),textarea,select,button[type="submit"],button:not([type])');
    });
  }

  function targetNote(control){
    const anchored=control.closest('[data-lesson-note]');
    if(anchored)return anchored.dataset.lessonNote;
    if(control.matches('button')){
      if(control.dataset.action==='smart-fill')return 'Можно заполнить черновик карточки по описанию, затем проверить поля.';
      return actionHints[form.dataset.id]||'Нажмите «'+control.textContent.trim()+'», чтобы завершить этот шаг.';
    }
    if(control.name==='description'&&form.dataset.id==='product')return 'Опишите материал, назначение и другие важные детали товара.';
    return fieldHints[control.name]||'Заполните это поле, чтобы продолжить.';
  }

  function select(control,{scroll=false,focus=false}={}){
    if(target){
      target.removeAttribute('aria-describedby');
      observer.unobserve(target);
    }
    target=control;
    overlay.hidden=!enabled||!target;
    if(overlay.hidden)return;
    target.setAttribute('aria-describedby',copy.id);
    copy.textContent=targetNote(target);
    observer.observe(target);
    if(scroll){
      const rect=target.getBoundingClientRect();
      const top=viewport?.offsetTop||0;
      const height=viewport?.height||window.innerHeight;
      if(rect.top<top+105||rect.bottom>top+height-115)target.scrollIntoView({block:'center',inline:'nearest'});
    }
    if(focus)target.focus({preventScroll:true});
    queue();
  }

  function queue(){
    if(!frame)frame=requestAnimationFrame(position);
  }

  function position(){
    frame=0;
    if(overlay.hidden||!target?.isConnected)return;
    const following=fields().indexOf(target)+1;
    advance.hidden=!(following>0&&following<fields().length);
    const rect=target.getBoundingClientRect();
    const startX=viewport?.offsetLeft||0;
    const startY=viewport?.offsetTop||0;
    const endX=startX+(viewport?.width||window.innerWidth);
    const endY=startY+(viewport?.height||window.innerHeight);
    const padding=5;
    const left=Math.max(startX,rect.left-padding);
    const top=Math.max(startY,rect.top-padding);
    const right=Math.min(endX,rect.right+padding);
    const bottom=Math.min(endY,rect.bottom+padding);
    const visible=right>left&&bottom>top;
    overlay.classList.toggle('lesson-spotlight-offscreen',!visible);
    if(!visible)return;

    Object.assign(hole.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
    callout.style.maxWidth=Math.min(330,endX-startX-24)+'px';
    const {width,height}=callout.getBoundingClientRect();
    const aboveSpace=top-startY;
    const belowSpace=endY-bottom;
    const above=aboveSpace>=height+37||aboveSpace>belowSpace;
    callout.classList.toggle('lesson-callout-below',!above);
    const center=(left+right)/2;
    const x=Math.max(startX+12,Math.min(center-width+38,endX-width-12));
    const y=Math.max(startY+8,Math.min(above?top-height-32:bottom+32,endY-height-8));
    Object.assign(callout.style,{left:x+'px',top:y+'px'});
    callout.style.setProperty('--pointer-left',Math.max(4,Math.min(center-x-23,width-32))+'px');
  }

  function refresh(){
    const toggle=app.querySelector('[data-lesson-toggle]');
    if(toggle)toggle.setAttribute('aria-pressed',String(enabled));
    form=toggle&&app.querySelector('.launch-step-form[data-form="onboarding"]');
    const controls=fields();
    const highlighted=app.querySelector('[data-lesson-note] > :is(a,button)');
    // Delivery status uses the forward action, even when an earlier stage can be restored.
    const next=form?.dataset.id==='delivery-status'?highlighted:controls[0]||highlighted;
    select(toggle?next:null,{scroll:enabled});
  }

  function toggle(){
    enabled=!enabled;
    refresh();
  }

  app.addEventListener('click',event=>{
    if(event.target.closest('[data-lesson-toggle]'))toggle();
  });
  app.addEventListener('focusin',event=>{
    if(!enabled||event.target===target||!form?.contains(event.target))return;
    if(fields().includes(event.target)||event.target.matches('[data-action="smart-fill"]'))select(event.target,{scroll:true});
  });
  app.addEventListener('change',queue);
  app.addEventListener('invalid',event=>{
    if(enabled&&form?.contains(event.target))select(event.target,{scroll:true});
  },true);
  advance.addEventListener('click',()=>{
    const controls=fields();
    const next=controls[controls.indexOf(target)+1];
    if(next&&target.reportValidity())select(next,{scroll:true,focus:true});
  });
  dismiss.addEventListener('click',()=>{
    toggle();
    app.querySelector('[data-lesson-toggle]')?.focus();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!overlay.hidden&&!document.querySelector('dialog[open]'))toggle();
  });
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',queue);
  viewport?.addEventListener('resize',queue);
  viewport?.addEventListener('scroll',queue,{passive:true});
  return refresh;
}
