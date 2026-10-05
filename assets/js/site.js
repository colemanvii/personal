document.documentElement.classList.add('js');
(function(){
  var toneKey='cole-paper-tone';
  var optionsKey='cole-paper-options';
  var tones=['tan','brown','white','gray','purple','sienna','umber','mustard','marigold','pulp-orange','peach','acid-yellow'];
  var labels={
    tan:'Tan',
    brown:'Warm brown',
    white:'White',
    gray:'Soft grey',
    purple:'Purple',
    sienna:'Burnt sienna',
    umber:'Burnt umber',
    mustard:'Mustard',
    marigold:'Marigold',
    'pulp-orange':'Pulp orange',
    peach:'Peach',
    'acid-yellow':'Acid yellow'
  };

  var softTones=['tan','white','gray'];

  function pickOptions(){
    var start=softTones[Math.floor(Math.random()*softTones.length)];
    var pool=tones.filter(function(t){ return t!==start; });
    for(var i=pool.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));
      var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;
    }
    return { start:start, options:[start].concat(pool.slice(0,2)) };
  }

  function getVisitState(){
    try{
      var storedTone=sessionStorage.getItem(toneKey);
      var storedOptions=JSON.parse(sessionStorage.getItem(optionsKey) || 'null');
      if(storedTone && Array.isArray(storedOptions) && storedOptions.length===3){
        return { tone:storedTone, options:storedOptions };
      }
    }catch(e){}

    var draw=pickOptions();
    try{
      sessionStorage.setItem(toneKey,draw.start);
      sessionStorage.setItem(optionsKey,JSON.stringify(draw.options));
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
        try{sessionStorage.setItem(toneKey,tone);}catch(e){}
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();