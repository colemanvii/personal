document.documentElement.classList.add('js');
(function(){
  var key='cole-paper-tone';
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
    var draw=pickOptions();
    var options=draw.options;
    render(options);

    var tone=draw.start;
    apply(tone);

    document.querySelectorAll('[data-paper-tone]').forEach(function(button){
      button.addEventListener('click',function(){
        tone=button.dataset.paperTone;
        apply(tone);
        try{localStorage.setItem(key,tone);}catch(e){}
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
})();