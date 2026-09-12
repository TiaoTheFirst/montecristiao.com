(() => {
  const d=document.createElement('dialog');d.className='reception-dialog';d.setAttribute('aria-labelledby','optional-title');
  d.innerHTML='<div class="reception-content"><button type="button" class="reception-close">关闭 ×</button><h2 id="optional-title" tabindex="-1"></h2><p id="optional-note"></p><a href="/letters">去私函匣 →</a></div>';
  d.style.cssText='width:560px;max-width:calc(100vw - 28px);height:fit-content;margin:auto';document.body.append(d);
  const panel=window.ManorMotion?.createPanel(d),close=()=>panel?panel.close():d.close();
  function notice(kind){d.querySelector('h2').textContent=kind==='memory'?'个人札记':'来访意见';d.querySelector('p').textContent=kind==='memory'?'个人札记保存尚未开放。您可以继续阅读，或到私函匣写信。':'独立的意见递交暂未开放。对府邸的建议可以写信告诉作者。';if(panel)panel.show();else d.showModal();d.querySelector('h2').focus();}
  d.querySelector('button').onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close();});
  window.Reception.notice=notice;window.ManorMemory={open:()=>notice('memory')};window.ManorFeedback={open:()=>notice('feedback')};
  document.addEventListener('click',e=>{if(e.target.closest('[data-feedback]')){e.preventDefault();notice('feedback');}});
  window.addEventListener('manor:feedback',()=>notice('feedback'));
  window.addEventListener('pagehide',()=>panel?panel.close({immediate:true}):d.close());
})();
