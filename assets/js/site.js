document.documentElement.classList.add('js');
(function(){
  var toneKey='cole-paper-tone-v2';
  var optionsKey='cole-paper-options-v2';
  var tones=['off-white','field-notes','violet-hour','red-earth'];
  var labels={'field-notes':'Field Notes — wheat and eggplant','violet-hour':'Violet Hour — lilac and plum','red-earth':'Red Earth — terracotta and ivory','off-white':'Off White — warm paper and dark ink'};

  var softTones=tones;

  function pickOptions(){
    return { start:'field-notes', options:tones.slice() };
  }

  function getVisitState(){
    try{
      var storedTone=localStorage.getItem(toneKey);
      var storedOptions=JSON.parse(localStorage.getItem(optionsKey) || 'null');
      if(storedTone && tones.includes(storedTone) && Array.isArray(storedOptions) && storedOptions.join(',')===tones.join(',')){
        return { tone:storedTone, options:storedOptions };
      }
    }catch(e){}

    var draw=pickOptions();
    try{
      localStorage.setItem(toneKey,draw.start);
      localStorage.setItem(optionsKey,JSON.stringify(draw.options));
    }catch(e){}
    return { tone:draw.start, options:draw.options };
  }

  function render(options){
    var holder=document.querySelector('.landing-paper');
    if(!holder) return;
    holder.innerHTML='';
    options.forEach(function(tone){
      var button=document.createElement('button');
      button.type='button';
      button.dataset.paperTone=tone;
      button.setAttribute('aria-label',labels[tone]);
      button.setAttribute('aria-pressed','false');
      holder.appendChild(button);
    });
  }

  function apply(tone){
    document.documentElement.dataset.tone=tone;
    document.querySelectorAll('[data-paper-tone]').forEach(function(button){
      button.setAttribute('aria-pressed',String(button.dataset.paperTone===tone));
    });
  }

  function bind(){
    var state=getVisitState();
    var tone=state.tone;

    render(state.options);
    apply(tone);

    document.querySelectorAll('[data-paper-tone]').forEach(function(button){
      button.addEventListener('click',function(){
        tone=button.dataset.paperTone;
        apply(tone);
        try{localStorage.setItem(toneKey,tone);}catch(e){}
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();