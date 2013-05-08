function extend(obj,queue,methodName){
	var childObj = {};
	while(obj && obj[methodName])
	{
		if(obj[methodName] != childObj[methodName]){
			if($.isArray(queue)){
			queue.push(obj[methodName]);
			}else{
			$.extend(true,queue,_.isFunction(obj[methodName])?obj[methodName]():obj[methodName]);
			}
			childObj = obj;	
		}
		obj = obj.constructor.__super__;
	}
	return queue;
}


var BaseModel = Backbone.Model.extend({
	defaults: function() {
        return extend.apply(this,[this,{},"_defaults"]);
    },
})

var EmbedModel = BaseModel.extend({
	_defaults: {
		template: '<div class="embed embed-thickBorder in"><span class="label title"></span><span class="label menu"><ul></ul></span></div>',
		markup: "inverse",
		title: "Base",
		links: {"Remove":{
			title: "Remove",
			icon: "icon-remove",
			callback: function(obj, e, elem){
				$(obj).remove();
			}},
		},
		placement: "topLeft",
	}
})

var EditableModel = EmbedModel.extend({
	_defaults: {
		"min-height": "40px"
	}
})

var NonEditableModel = EmbedModel.extend({
	_defaults: {
		"height": "100px"
	}
})

var BaseView = Backbone.View.extend({
	defaults: function() {
        return this.initQueue.apply(this,[{},"_defaults"]);
    },
    
	model: new BaseModel(),
    _initialize: function(){
    	console.log("Base View Initialized");
    	
    },
    executeQueue: function(queue,bottom){
    	var i = bottom?0:queue.length-1;
    	while((bottom && i<queue.length) ||(!bottom && i>=0)){
    		queue[i].apply(this);
    		i=bottom?i+1:i-1;
    	}
    },
    initQueue: function(queue,methodName){
		return extend(this,queue,methodName);
    },
    
    initialize: function(){
    	this.options = _.extend(this.defaults, this.options);
    	this.initializeChain = this.initializeChain || this.initQueue.apply(this,[[],"_initialize"]);
    	this.executeQueue.apply(this,[this.initializeChain]);
    },
    events: function() {
        return this.initQueue.apply(this,[{},"_events"]);
    },
    
    render: function(){
    	this.renderChain = this.renderChain || this.initQueue.apply(this,[[],"_render"]);
    	this.executeQueue.apply(this,[this.renderChain]);
    	return this;
    },
    
	unrender: function(){
	      $this.$el.remove();
	},
})  

var EmbedMenu = BaseView.extend({
	_events: {
		"click": 'toggleContent',
		"hover": 'toggleContent'
	},
	model: new EmbedModel(),
    _initialize: function(){
    	console.log("EmbedMenu Initialized");
    },
    tip: function () {
        return this.$tip = this.$tip || $(this.model.get("template"))
    },
    title: function(){
    	return this.$tl = this.$tl || this.tip().find('.title');
    },
    menu: function(){
    	return this.$ml = this.$ml || this.tip().find('.menu');
    }
    
    , _render: function(){
    	var $tip = this.tip()
    	   , ul = $tip.find('ul')
    	   , opts = this.model.attributes;
    	if(!_.isEmpty(opts.links)){
    		$.each(opts.links,function(key,val){
            	var con = '<i class="'+(val.icon||'')+'" title="'+(val.title||'')+'">'+(val.icon?'':val.title)+'</i>';
            	$('<li><a href="javascript:void(0)"><span class="label">'+con+'</span></a></li>').appendTo(ul).on('click',function(e){
            		val.callback($element,e, this);
            		e.preventDefault();
            		e.stopPropagation();
            	});
            });
    	}
        if(opts.title){
        	this.title().text(opts.title);
        }
        $tip.find('.label').addClass(opts.markup === 'default'?'label':'label-'+opts.markup)
        $tip.css({"border-color":this.title().css("background-color")}).appendTo(this.$el)
    }
    , getPosition: function () {
	      var el = this.$el[0]
	      return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
	        width: el.offsetWidth
	      , height: el.offsetHeight
	      }, this.$el.offset())
	 },
	placeContent: function(){
    	var opts = this.model.attributes
    	, pos = this.getPosition()
    	, $tip = this.tip()
    	, $l = this.title()
        , $n = this.menu()
        , lp = {}
        , np = {}
    	$tip.css({ top: 0, left: 0,position:'absolute',width: pos.width, height: pos.height});
    	 actualWidth = $tip[0].offsetWidth
         actualHeight = $tip[0].offsetHeight
                            
         tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width / 2 - actualWidth / 2}
         
         $tip.offset(tp);
        
        
         if(opts.placement.indexOf("top") != -1){
       	  lp.top = tp.top - $l[0].offsetHeight;
       	  np.top = tp.top + actualHeight;
       	  $l.addClass("embed-topBorder");
       	  $n.addClass("embed-bottomBorder")
         }else{
       	  lp.top = tp.top + actualHeight;
       	  np.top = tp.top - $n[0].offsetHeight
       	  $l.addClass("embed-bottomBorder");
       	  $n.addClass("embed-topBorder")
         }
         if(opts.placement.indexOf("Left") != -1){
       	  lp.left = tp.left;
       	  np.left = tp.left + actualWidth - $n[0].offsetWidth;
         }else{
       	  lp.left = tp.left + actualWidth - $l[0].offsetWidth;
       	  np.left = tp.left;
         }
         
         $l.offset(lp);
         $n.offset(np);
    },
    toggleContent: function(e){
    	if(!this.tip().hasClass('in')) return;
    	this.tip().show();
    	e.type === 'mouseenter' || e.type === 'mouseleave'?this.title().toggleClass('in'):this.menu().toggleClass('in');
    	var title = this.title().hasClass('in');
    	var menu = this.menu().hasClass('in');
    	var border = menu?'embed-thickBorder':title?'embed-thinBorder':'embed-noBorder';
    	this.tip().removeClass('embed-thickBorder embed-thinBorder embed-noBorder').addClass(border);
    	this.menu().toggle(menu);
    	this.title().toggle(title);
    	if(menu || title)
    		this.placeContent();
    },
   
	unrenderContent: function(){
	    this.tip().hide();
	},
    
})

var NonEditableView = EmbedMenu.extend({
    	model: new NonEditableModel(),
	_render:  function(){
		this.$el.css({"height":this.model.get("height")});
	}
});
var EditableView = EmbedMenu.extend({
    model: new EditableModel(),
	_events: {
		"dblclick": "toggleEditable"
	},
	
	toggleEditable: function(e){
		if(this.eArea().is("[contenteditable='true']")){
			this.eArea().removeClass("edit-Border").attr('contenteditable','false');
			this.tip().addClass('in');
			this.$el.trigger('click');
			
		}else{
			this.tip().removeClass('in').hide();
			this.eArea().addClass("edit-Border").attr('contenteditable','true');
		}
	},
	eArea: function(){
		return this.$eArea = this.$eArea || $('<div class="editable"></div>')
	},
	_render:  function(){
		this.eArea().offset(this.$el.offset()).css({"min-height":this.model.get("min-height")}).appendTo(this.$el);
	}

})

var ChildView = EditableView.extend({
	_events: {
		"click": "showDisplay"
	},
	_initialize: function(){
    	console.log("Child View Initialized");
    },
    _render: function(){
    	this.$el.css({width:200,position:"absolute",top:100,left:100});
    },
	showDisplay: function(){
		console.log("Show Display at Child View");
	}
	
});

var SubChildView = NonEditableView.extend({
	_event: {
		"hover": "showHover"
	},
	_initialize: function(){
    	console.log("Sub Child View Initialized");
    },
    _render: function(){
    	this.$el.css({backgroundColor: "green",top: 500, left:500, position: 'absolute', width: 200});
    },
	showHover: function(){
		console.log("Show Hover at Sub Child View");
	}
})
