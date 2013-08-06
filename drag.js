angular.module('drag', [])
.directive('splitbar',function(){
    return {
        controller: function($scope,$attrs, $element){
            $scope.axisX = !$attrs.axis || $attrs.axis == 'x';
            $scope.axisY = !$attrs.axis || $attrs.axis == 'y';
            $element.css({
                width: $scope.axisX?'30px':'50px',
                height: $scope.axisY?'4px':'50px'
            });
        },
        link: function(scope,element,attr){
            
        }
    }
})  
.directive('draggable', function($document,$window) {
    function toNum(x){
          return isNaN(parseInt(x))?0:parseInt(x);
      }
     function pos(obj, top, left){
          var s = {};
          if(top) s["top"] = top + 'px';
          if(left) s["left"] = left + 'px';
          obj.css(s);
          return obj;
      }
      function normaliseEvent(event)
      {
          event = event.touches?event.touches[0]:event;
      }
    return {
        scope: {
            onDragged: "&"
        },
        controller: function($scope,$attrs,$element){
            
                var elemStr = $attrs.bound;
                if(elemStr == 'parent'){
                    elem = $element.parent();
                }else if(elemStr == 'document'){
                    elem = $document;
                }else if(elemStr == 'window'){
                    elem = $window;
                }
            if(angular.isElement(elem)){
                $scope.bound = [elem[0].offsetLeft,elem[0].offsetTop,elem[0].offsetLeft+elem[0].offsetWidth-$element[0].offsetWidth, elem[0].offsetTop+elem[0].offsetHeight-$element[0].offsetHeight];
               }
               if(angular.isArray(eval('elemStr'))){
                $scope.bound = eval('elemStr');
            }
            
            $scope.collapsed = function(rightBottom){
                
            }
            $scope.axisX = !$attrs.axis || $attrs.axis == 'x';
            $scope.axisY = !$attrs.axis || $attrs.axis == 'y';
            
            
        },
    
       link: function(scope, element, attr) {
    var endTypes = 'touchend touchcancel mouseup mouseleave'
    ,   moveTypes = 'touchmove mousemove'
    ,   startTypes = 'touchstart mousedown'  
    ,   startX = 0
    ,   startY = 0
    ,   isRelative = (element.css('position') == 'relative')?true:false
    ,   startTop=isRelative?toNum(element.css('top')):element[0].offsetTop
    ,   startLeft=isRelative?toNum(element.css('left')):element[0].offsetLeft
    ,   x = 0
    ,   y = 0
    ,   shadow = null;   
    
      
    element.css({
      cursor: 'pointer'
    });
      
    element.bind(startTypes, function(event) {
      // Prevent default dragging of selected content
      normaliseEvent(event);
      event.preventDefault();
      startX = event.pageX;
      startY = event.pageY;
      x = 0;
      y = 0;
      $document.bind(moveTypes, mousemove);
      $document.bind(endTypes, mouseup);
    });
      
      
           
    function mousemove(event) {
        normaliseEvent(event);
        var nor=normaliseMovement(event.pageX - startX,event.pageY - startY);
        y = nor[1];
        x = nor[0];
        if(attr.helper){
        if(shadow == null){
            shadow = (attr.helper == 'clone')?getShadow():attr.helper();
            element.after(shadow);
        }
            setPos(shadow,y+element[0].offsetTop,x+element[0].offsetLeft).css({display: 'block'})         
        } else {
        setPos(element,y + startTop,x  + startLeft);        
       }
    }
      
    function mouseup() {
      setPos(element,y + startTop,x  + startLeft);
        startTop += y;
        startLeft += x;
        if(scope.onDragged){
            scope.onDragged({w:x,h:y});}
      if(attr.helper)     
          shadow.css({display:'none'});
      
      angular.forEach(moveTypes.split(" "),function(val){
          $document.unbind(val, mousemove);
      })
      angular.forEach(endTypes.split(" "),function(val){
          $document.unbind(val, mouseup);
      })
      
    }
           function normaliseMovement(x,y){
              var bound = scope.bound
              ,   currx = element[0].offsetLeft + x
              ,   curry = element[0].offsetTop + y
              ,   diffx = 0
              ,   diffy = 0;
              if(angular.isArray(bound)){
                   if(currx < bound[0])
                       diffx = currx - bound[0];
                   if(currx > bound[2])
                       diffx = currx - bound[2];
                   if(curry < bound[1])
                       diffy = curry - bound[1];
                   if(curry > bound[3])
                       diffy = curry - bound[3];
               }
               y = scope.axisY?y - diffy:0;
               x = scope.axisX?x - diffx:0;
               return [x,y]
              
               
           }
      function getShadow(){
          return angular.element("<div></div>").css({width:element[0].offsetWidth+'px',height:element[0].offsetHeight+'px',backgroundColor: 'lightBlue', border: '1px solid darkCyan', position: 'absolute'}).addClass("shadow");
      }
           
      
     
  }
    }});
