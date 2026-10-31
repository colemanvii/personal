document.addEventListener('DOMContentLoaded',function(){
  var dialog=document.querySelector('.product-dialog');
  var product=document.querySelector('.product');
  var close=document.querySelector('.product-close');
  if(!dialog||!product||!close) return;
  product.addEventListener('click',function(){ dialog.showModal(); });
  close.addEventListener('click',function(){ dialog.close(); });
  dialog.addEventListener('click',function(e){ if(e.target===dialog) dialog.close(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&dialog.open) dialog.close(); });
});