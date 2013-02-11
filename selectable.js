!(function( $ ) {
  
	"use strict"; 
	
	var Selectable = function(elem){
		this.init(elem);
	};
	
	Selectable.prototype = {
			constructor: Selectable,
			init	   : function(elem){
							var html = '<div class="dropdown selectable"><a href="#" role="button" class="btn dropdown-toggle" data-toggle="dropdown"></a><ul class="dropdown-menu" role="menu" aria-labelledby="drop1">'
							  , that = this;
							elem.find('li,option').each(function(index){
								var e = $(this);
								html += '<li><a tabindex="-1" href="#" value=' + (e.val() || e.attr("svalue") || "")  + ' selectedIndex=' + index + ' >';
								html += e.html();
								html += '</a></li>';
							});
							html += '</ul></div>';
							this.ui = $(html).insertAfter(elem).on("click","li,option",function(){
								that.replaceNode($(this));
							});
							this.val(0);
							elem.hide();
						},
			replaceNode 	: function(elem){
							var a = elem.children('a');
							var width = a.width() || a.children().width() || 120;
							var height = a.height() || a.children().height() || 26;
							var b = elem.parent().siblings('a');
							b.css("width",(width + 16) +"px");
							b.html('<div  style="float: left;width:' + width + 'px">' + a.html() + '</div>' + ' <b class="caret" style="margin-left:4px;margin-top:'+height/2+'px"></b>' + '</div>');
							b.attr('value',a.attr('value'));
							b.attr('selectedIndex',a.attr('selectedIndex'));
						},
			toggle		: function(){
							this.ui.find('a:first').dropdown('toggle');
						},
			val			: function(value){
							if(typeof value === 'number'){
								this.replaceNode($(this.ui.find("li,option")[value]));
							}
							else if(typeof value === 'string'){
								var that = this;
								this.ui.find("li,option").each(function(index,elem){
									if(value === $(elem).text()){
										that.val(index);
										return false;
									}
								});
							}
							else{
								//get
								return this.ui.find('a:first').attr("value");
							}
						},
			selectedIndex: function(){
							//get
							return this.ui.find('a:first').attr("selectedIndex");
						}
	}
	
	 $.fn.selectable = function(option,arg) {
		var ret;
			this.each(function () {
		      var $this = $(this)
		        , data = $this.data('selectable')
		      if (!data) $this.data('selectable', (data = new Selectable($this)))
		      if (typeof option == 'string') ret = data[option].call(data,arg);
		    });
			return ret;
  };
})( jQuery );
