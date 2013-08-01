angular.module('drag', []).
directive('draggable', function($document) {
  return function(scope, element, attr) {
    var endTypes = 'touchend touchcancel mouseup mouseleave'
    ,   moveTypes = 'touchmove mousemove'
    ,   startTypes = 'touchstart mousedown'  
    ,   startX = 0
    ,   startY = 0 
    ,   startTop=toNum(element.css('top'))    ,startLeft=toNum(element.css('left')), x = 0, y = 0
    ,   shadow = null
    ,   isRelative = (element.css('position') == 'relative')?true:false;
    
      
    element.css({
      cursor: 'pointer'
    });
      
    element.bind(startTypes, function(event) {
      // Prevent default dragging of selected content
      normaliseEvent(event);
      event.preventDefault();
      startX = event.pageX;
      startY = event.pageY;
      startTop = isRelative?startTop:element[0].offsetTop;
      startLeft = isRelative?startLeft:element[0].offsetLeft;
      $document.bind(moveTypes, mousemove);
      $document.bind(endTypes, mouseup);
    });
      
      function getShadow(){
          return angular.element("<div></div>").css({width:element[0].offsetWidth+'px',height:element[0].offsetHeight+'px',backgroundColor: 'lightBlue', border: '1px solid darkCyan', position: 'absolute'}).addClass("shadow");
      }
    function mousemove(event) {
        normaliseEvent(event);
        y = event.pageY - startY;
        x = event.pageX - startX;
        if(attr.helper){
        if(shadow == null){
            shadow = (attr.helper == 'clone')?getShadow():attr.helper();
            element.after(shadow);
        }
            setPos(shadow,isAxis('y')?y + element[0].offsetTop:element[0].offsetTop, isAxis('x')?x + element[0].offsetLeft:element[0].offsetLeft).css({display: 'block'})         
        } else {
        setPos(element,isAxis('y') && y + startTop,isAxis('x') && x  + startLeft);        
       }
    }
      function toNum(x){
          return isNaN(parseInt(x))?0:parseInt(x);
      }
    function mouseup() {
      setPos(element,isAxis('y') && y + startTop,isAxis('x') && x  + startLeft);
        startTop += isAxis('y')?y:0;
        startLeft += isAxis('x')?x:0;
      if(attr.helper)     
          shadow.css({display:'none'});
      
      angular.forEach(moveTypes.split(" "),function(val){
          $document.unbind(val, mousemove);
      })
      angular.forEach(endTypes.split(" "),function(val){
          $document.unbind(val, mouseup);
      })
      
    }
      function isAxis(k){
          return !attr.axis || attr.axis == k;
      }
      function setPos(obj, top, left){
          var s = {};
          if(top)
              s["top"] = top + 'px';
          if(left)
              s["left"] = left + 'px';
          obj.css(s);
          return obj;
      }
      function normaliseEvent(event)
      {
          event = event.touches?event.touches[0]:event;
      }
  }
});
