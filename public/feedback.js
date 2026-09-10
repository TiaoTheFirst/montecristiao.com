(() => {
  window.ManorMemory = {open:()=>Reception.notice('memory')};
  window.ManorFeedback = {open:()=>Reception.notice('feedback')};
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-feedback]')){e.preventDefault();Reception.notice('feedback');}
  });
  window.addEventListener('manor:feedback',()=>Reception.notice('feedback'));
})();
