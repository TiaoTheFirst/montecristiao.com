/* Public visits: no account form, personal-data collection or mail delivery. */
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'reception-dialog public-reception';
  dialog.setAttribute('aria-labelledby','public-reception-title');
  dialog.innerHTML = `<div class="reception-layout"><aside class="butler-portrait"><img src="assets/baptistin.png" width="1024" height="1536" alt="接待管家巴蒂斯坦"></aside><div class="reception-content"><button class="reception-close" type="button">关闭 ×</button><h2 id="public-reception-title" tabindex="-1">来访接待</h2><p id="public-reception-text"></p><div class="service-menu"><a href="index.html#court">返回前院</a><a href="index.html#study">去书房</a><a href="about.html">府邸说明</a><a href="privacy.html">隐私说明</a></div></div></div>`;
  const style=document.createElement('style');
  style.textContent='.public-reception{width:600px;height:fit-content;max-width:calc(100vw - 28px);margin:auto}.public-reception .reception-layout{display:block;min-height:0}.public-reception .butler-portrait{display:none}.public-reception .reception-close{position:static;color:inherit}.public-reception .reception-content{padding:28px}';
  document.head.append(style);
  document.body.append(dialog);
  const panel = ManorMotion.createPanel(dialog);
  const notice = (kind = 'register') => {
    dialog.querySelector('#public-reception-title').textContent = kind === 'feedback' ? '来访意见' : kind === 'memory' ? '个人札记' : '来访接待';
    dialog.querySelector('#public-reception-text').textContent = kind === 'feedback'
      ? '来访意见的在线递交尚未开放。您可以先继续参观。'
      : kind === 'memory' ? '个人札记的保存尚未开放，当前不会收存您的文字。'
      : '名片登记与私人通信尚未开放。您无需登记，可以自由参观府邸。';
    panel.show();
    dialog.querySelector('#public-reception-title').focus();
  };
  dialog.querySelector('.reception-close').onclick = () => panel.close();
  dialog.addEventListener('cancel',e=>{e.preventDefault();panel.close();});
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close();
  });
  const bell=document.createElement('button');
  bell.className='butler-bell';bell.dataset.reception='services';bell.textContent='唤管家';document.body.append(bell);
  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-reception]');
    if(!trigger)return;
    e.preventDefault();
    if(trigger===bell&&document.body.classList.contains('living-estate')) window.dispatchEvent(new CustomEvent('manor:butler'));
    else notice(trigger.dataset.reception);
  });
  window.Reception={user:null,open:notice,notice,refresh:async()=>null,needLogin:()=>notice(),api:async()=>{const e=new Error('此项服务尚未开放。');e.code='SERVICE_NOT_OPEN';throw e;}};
  window.addEventListener('pagehide',()=>panel.close({immediate:true}));
})();
