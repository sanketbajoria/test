angular.module('drag', []).
directive('draggable', function($document) {
  return function(scope, element, attr) {
    var startX = 0, startY = 0, startTop=toNum(element.css('top')), startLeft=toNum(element.css('left')), x = 0, y = 0;
    var shadow = null;
    element.css({
     border: '1px solid red',
     backgroundColor: 'lightgrey',
     cursor: 'pointer'
    });
      var isRelative = (element.css('position') == 'relative')?true:false;
    element.bind('mousedown', function(event) {
      // Prevent default dragging of selected content
      event.preventDefault();
      startX = event.screenX;
      startY = event.screenY;
        startTop = isRelative?startTop:element[0].offsetTop;
      startLeft = isRelative?startLeft:element[0].offsetLeft;
        
      $document.bind('mousemove', mousemove);
      $document.bind('mouseup', mouseup);
    });
      
      function getShadow(){
          return angular.element("<div></div>").css({width:element[0].offsetWidth+'px',height:element[0].offsetHeight+'px',backgroundColor: 'lightBlue', border: '1px solid darkCyan', position: 'absolute'}).addClass("shadow");
      }
    function mousemove(event) {
      axis = attr.axis;  
        y = (!axis || axis == 'y')?(event.screenY - startY):element.prop('top');
        x = (!axis || axis == 'x')?(event.screenX - startX):element.prop('left');
        if(attr.helper){
        if(shadow == null){
            shadow = (attr.helper == 'clone')?getShadow():attr.helper();
            element.after(shadow);
        }
                 
      shadow.css({
        top: y + element[0].offsetTop + 'px',
        left:  x + element[0].offsetLeft + 'px',
          display: 'block'
      });
        } else {
        element.css({top: y + startTop +'px',left: x  + startLeft + 'px'})
        }
    }
      function toNum(x){
          return isNaN(parseInt(x))?0:parseInt(x);
      }
    function mouseup() {
      element.css({top: y + startTop +'px',left: x  + startLeft + 'px'})
      startTop += y;
      startLeft += x;
      if(attr.helper)     
          shadow.css({display:'none'});
      $document.unbind('mousemove', mousemove);
      $document.unbind('mouseup', mouseup);
    }
      function setPos(obj, top, left){
          var s = {};
          if(top)
              s["top"] = top + 'px';
          if(left)
              s["left"] = left + 'px';
          obj.css(s);
      }
  }
});
