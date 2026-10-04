document.documentElement.classList.add('js');
(function(){
  var key='cole-paper-tone';
  function apply(tone){
    document.documentElement.dataset.tone=tone;
    document.querySelectorAll('[data-paper-tone]').forEach(function(button){
      button.setAttribute('aria-pressed',String(button.dataset.paperTone===tone));
    });
  }
  var tone='gray';
  try { var saved=localStorage.getItem(key); if(['tan','brown','white','gray','purple','sienna','umber'].includes(saved)) tone=saved; } catch(e){}
  apply(tone);
  function bind(){
    apply(tone);
    document.querySelectorAll('[data-paper-tone]').forEach(function(button){
      button.addEventListener('click',function(){
        tone=button.dataset.paperTone;apply(tone);
        try{localStorage.setItem(key,tone);}catch(e){}
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();