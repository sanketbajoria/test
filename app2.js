
var App = {}


var EmbedMenu = Backbone.BaseView.extend({
  _events: {
		"click": 'toggleContent',
		"hover": 'toggleContent'
	},
	_options: {
		template: '<div class="embed embed-thickBorder in"><span class="label title"></span><span class="label menu"><ul></ul></span></div>',
		markup: "inverse",
		title: "Base",
		links: {"Remove":{
			title: "Remove",
			icon: "icon-remove",
			callback: function(e){
				this.$el.remove();
			}}
		},
		placement: "topLeft"
	},
	
    _initialize: function(){
    	var self = this;
    	
    	console.log("EmbedMenu Initialized");
    },
    tip: function () {
        return this.$tip = this.$tip || $(this.options.template)
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
    	   , opts = this.options
    	   , self = this;
    	if(!_.isEmpty(opts.links)){
    		$.each(opts.links,function(key,val){
            	var con = '<i class="'+(val.icon||'')+'" title="'+(val.title||'')+'">'+(val.icon?'':val.title)+'</i>';
            	$('<li><a href="javascript:void(0)"><span class="label">'+con+'</span></a></li>').appendTo(ul).on('click',function(e){
            		val.callback.apply(self,[e]);
            		e.preventDefault();
            		e.stopPropagation();
            	});
            });
    	}
        if(opts.title){
        	this.title().text(opts.title);
        }
        $tip.find('.label').addClass(opts.markup === 'default'?'label':'label-'+opts.markup)
    }
    , getPosition: function () {
	      var el = this.$el[0]
	      return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
	        width: el.offsetWidth
	      , height: el.offsetHeight
	      }, this.$el.offset())
	 },
	placeContent: function(menu,title){
		var border = menu?'embed-thickBorder':title?'embed-thinBorder':'embed-noBorder';
    	this.tip().removeClass('embed-thickBorder embed-thinBorder embed-noBorder').addClass(border);
    	if(menu)title=true;
    	this.menu().toggle(menu).toggleClass('in',menu);
    	this.title().toggle(title).toggleClass('in',title);
    	if(!(menu || title)){this.tip().detach();return;}
    	var opts = this.options
    	, pos = this.getPosition()
    	, $tip = this.tip()
    	, $l = this.title()
        , $n = this.menu()
        , lp = {}
        , np = {}
    	$tip.detach().css({ top: 0, left: 0,position:'absolute',width: pos.width, height: pos.height}).appendTo($('body'));
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
    	console.log("toggleContent - " + e.type);
    	if(this instanceof Choice){
    		console.log("Choice hover");
    	}
    	if(!this.tip().hasClass('in')) return;
    	this.tip().show();
    	var title = this.title().hasClass('in');
    	var menu = this.menu().hasClass('in');
    	if(e.type=='click'){
    		menu = !menu;
    		Backbone.trigger('update:schema',this.model, menu);
    		if(App['cur'])
    			App['cur'].placeContent(false,false);
    		App['cur'] = this;
    	}else{
    		if(e.type==='mouseenter'){
    			title = true;
    		}else if(e.type="mouseleave"){
    			title = false;
    		}
    	}
    	this.placeContent(menu,title);
    	e.preventDefault();
		e.stopPropagation();
    },
   
	unrender: function(){
	    this.tip().hide();
	}
    
})

var NonEditableView = EmbedMenu.extend({
	_options:{
		styleClass: ""
	},
	_render:  function(){
		this.$el.addClass('noneditable').addClass(this.options.styleClass);
	}
});
var EditableView = EmbedMenu.extend({
	_options:{
		styleClass: ""
	},
	_events: {
		"dblclick": "toggleEditable"
	},
	
	toggleEditable: function(e){
		if(this.$el.is("[contenteditable='true']")){
			this.$el.removeClass("edit-Border").attr('contenteditable','false');
			this.tip().addClass('in');
			this.$el.trigger('click');
			
		}else{
			this.tip().removeClass('in').hide();
			this.$el.addClass("edit-Border").attr('contenteditable','true');
		}
	},
	_render:  function(){
		this.$el.addClass('editable');
		//this.eArea().offset(this.$el.offset()).addClass(this.options["styleClass"]).appendTo(this.$el);
	}

});
var SchemaView = Backbone.View.extend({
	initialize: function(){
	    // subscribe to the event aggregator's event
	    Backbone.on("update:schema", this.updateView, this);
	  },
	render: function(){
		return this;
	},
	updateView:function(model,show){
		this.$el.empty();
		if(show){
			this.model = model;
			this.$el.append(new Backbone.Form({
	            model: model
	        }).render().el);
		}
	}  
});
var ChoiceModel = Backbone.BaseModel.extend({
	_defaults:{
		identifier: _.uniqueId('choice'),
		fixed: false,
		hide: false
	},
	_schema:{
		fixed: 'Checkbox',
		hide: 'Checkbox'
	}
})

var Choice = EditableView.extend({
	_options:{
		model: new ChoiceModel(),
		styleClass: 'choice'
	}
});
var ChoiceInteractionModel = Backbone.BaseModel.extend({
	_defaults:{
		shuffle: false,
		maxChoices: 1,
		minChoices: 0,
		layout: 'Linear',
		orientation: 'Vertical',
		choices:[]
	},
	_schema:{
		shuffle: 'Checkbox',
		maxChoices: 'Number',
		minChoices: 'Number',
		layout: {type:'Select', options:['Linear','Grid']},
		orientation:{type:'Select',options:['Vertical','Horizontal']}
	}
})

var ChoiceInteraction = NonEditableView.extend({
	_options:{
		model: new ChoiceInteractionModel(),
		styleClass: 'choiceInteraction',
		links: {
			'Add':{
				title: "Add",
				icon: "icon-plus",
				callback: function(e){
					var choice = new Choice();
					this.model.get("choices").push(choice);
					this.$el.append(choice.render().el);
					this.placeContent(true,true);
				}}
		}
	}
})



var ChildView = EditableView.extend({
	_initialize: function(){
    	console.log("Child View Initialized");
    },
    _render: function(){
    	this.$el.css({width:200,position:"absolute",top:100,left:100});
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
