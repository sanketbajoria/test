var Form = Backbone.View.extend({
  initialize : function(options) {

	},
	createFieldset : function(schema) {

	},
	createField : function(key, schema) {

	},

	render : function() {
		var self = this, fields = this.fields;

		// Render form
		var $form = $($.trim(this.template(_.result(this, 'templateData'))));

		// Render standalone editors
		$form.find('[data-editors]').add($form).each(
				function(i, el) {
					var $container = $(el), selection = $container
							.attr('data-editors');

					if (_.isUndefined(selection))
						return;

					// Work out which fields to include
					var keys = (selection == '*') ? self.selectedFields
							|| _.keys(fields) : selection.split(',');

					// Add them
					_.each(keys, function(key) {
						var field = fields[key];

						$container.append(field.editor.render().el);
					});
				});

		// Render standalone fields
		$form.find('[data-fields]').add($form).each(
				function(i, el) {
					var $container = $(el), selection = $container
							.attr('data-fields');

					if (_.isUndefined(selection))
						return;

					// Work out which fields to include
					var keys = (selection == '*') ? self.selectedFields
							|| _.keys(fields) : selection.split(',');

					// Add them
					_.each(keys, function(key) {
						var field = fields[key];

						$container.append(field.render().el);
					});
				});

		// Render fieldsets
		$form.find('[data-fieldsets]').add($form).each(
				function(i, el) {
					var $container = $(el), selection = $container
							.attr('data-fieldsets');

					if (_.isUndefined(selection))
						return;

					_.each(self.fieldsets, function(fieldset) {
						$container.append(fieldset.render().el);
					});
				});

		// Set the main element
		this.setElement($form);

		return this;
	},

});





_.mixin({
	typeSupport:function(type){
		var elem = document.createElement('input');
		elem.setAttribute('type',type);
		return elem.getAttribute('type')===type;
	}
});
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

var BaseView = Backbone.View.extend({
   
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
    	this.initializeChain = this.initializeChain || this.initQueue.apply(this,[[],"_initialize"]);
    	this.executeQueue.apply(this,[this.initializeChain]);
    },
    options: function(){
    	return this.initQueue.apply(this,[{},"_options"]);
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

Form.Editor = Form.editors.Base = BaseView.extend({

  defaultValue: '',
  sel: '',
  tagName: 'input',

  _initialize: function(options) {
    var options = options || {};
    this._events['change '+ sel] = function(e){
		  this.trigger('change', this);
	  }

    // Set initial value
    if (options.model) {
      if (!options.key) throw "Missing option: 'key'";

      this.model = options.model;

      this.value = this.model.get(options.key);
    }
    else if (options.value) {
      this.value = options.value;
    }

    if (this.value === undefined) this.value = this.defaultValue;

    //Store important data
    _.extend(this, _.pick(options, 'key', 'form'));

    var schema = this.schema = options.schema || {};

    this.validators = options.validators || schema.validators;

    //Main attributes
    this.$el.attr('id', this.id);
    this.$el.attr('name', this.name());
    if (schema.editorClass) this.$el.addClass(schema.editorClass);
    if (schema.editorAttrs) this.$el.attr(schema.editorAttrs);
  },

  /**
   * Get the value for the form input 'name' attribute
   *
   * @return {String}
   *
   * @api private
   */
  name: function() {
    var key = this.key || '';

    //Replace periods with underscores (e.g. for when using paths)
    return key.replace(/\./g, '_');
  },
  
  val: function(val){
	  if(!val) return this.$el.val();
	  this.$el.val(val);
  },

  trigger: function(event) {
	    return Backbone.View.prototype.trigger.apply(this, arguments);
  },
 
  commit: function(options) {
    var error = this.validate();
    if (error) return error;

    this.listenTo(this.model, 'invalid', function(model, e) {
      error = e;
    });
    this.model.set(this.key, this.getValue(), options);

    if (error) return error;
  },

  

 
});

/**
 * Text
 * 
 * Text input with focus, blur and change events
 */
Form.editors.Text = Form.Editor.extend({


  _initialize: function(options) {

    var schema = this.schema;

    //Allow customising text type (email, phone etc.) for HTML5 browsers
    var type = 'text';

    if (schema && schema.editorAttrs && schema.editorAttrs.type) type = schema.editorAttrs.type;
    if (schema && schema.dataType) type = schema.dataType;

    this.$el.attr('type', type);
  },

  /**
   * Adds the editor to the DOM
   */
  render: function() {
    this.val(this.value);
    return this;
  },

 
  



});

/**
 * TextArea editor
 */
Form.editors.TextArea = Form.editors.Text.extend({

  tagName: 'textarea'

});

/**
 * Password editor
 */
Form.editors.Password = Form.editors.Text.extend({

  _initialize: function(options) {

    this.$el.attr('type', 'password');
  }

});

/**
 * NUMBER
 * 
 * Normal text input that only allows a number. Letters etc. are not entered.
 */
Form.editors.Number = Form.editors.Text.extend({

  defaultValue: 0,
  _events: {
	  'keypress': function(e){
			var newVal = this.$el.val() + String.fromCharCode(e.charCode);
			if(!(/^[0-9]*\.?[0-9]*?$/.test(newVal))){
				e.preventDefault();
			}
		}
  },
  _initialize: function(options) {
    if(_.typeSupport('number')){
    	this.$el.attr('type', 'number');
        this.$el.attr('step', 'any');
    }
    
  },

});

/**
 * Hidden editor
 */
Form.editors.Hidden = Form.editors.Base.extend({

  _initialize: function(options) {
    this.$el.attr('type', 'hidden');
  },
});

/**
 * Checkbox editor
 *
 * Creates a single checkbox, i.e. boolean value
 */
Form.editors.Checkbox = Form.editors.Base.extend({

  defaultValue: false,

 

  _initialize: function(options) {
    this.$el.attr('type', 'checkbox');
  },

  render: function() {
    this.val(this.value);
    return this;
  },
  
  val: function(val){
	  if(!val) return this.$el.prop('checked');
	  this.$el.prop('checked', new Boolean(val));
  },

});

/**
 * Select editor
 *
 * Renders a <select> with given options
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Select = Form.editors.Base.extend({

  tagName: 'select',

  _initialize: function(options) {
    if (!this.schema || !this.schema.options) throw "Missing required 'schema.options'";
  },

  render: function() {
    this.setOptions(this.schema.options);
    return this;
  },

  /**
   * Sets the options that populate the <select>
   *
   * @param {Mixed} options
   */
  setOptions: function(options) {
    var self = this;

    //If a collection was passed, check if it needs fetching
    if (options instanceof Backbone.Collection) {
      //Don't do the fetch if it's already populated
      if (options.length > 0) {
        this._collectionToHtml(options);
      } else {
        options.fetch({
          success: function() {
            self._collectionToHtml(options);
          }
        });
      }
    }
    //Otherwise, ready to go straight to renderOptions
    else {
      this.renderOptions(_.result(this.schema,options));
    }
  },

  /**
   * Adds the <option> html to the DOM
   * @param {Mixed}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   *                      or as a string of <option> HTML to insert into the <select>
   */
  renderOptions: function(options) {
    var $select = this.$el,
        html;

    html = this._getOptionsHtml(options);

    //Insert options
    $select.html(html);

    //Select correct option
    this.val(this.value);
  },

  _getOptionsHtml: function(options) {
    var html;
    //Accept string of HTML
    if (_.isString(options)) {
      html = options;
    }

    //Or array
    else if (_.isArray(options)) {
      html = this._arrayToHtml(options);
    }

    //Or Backbone collection
    else if (options instanceof Backbone.Collection) {
      html = this._collectionToHtml(options);
    }

    else if (_.isFunction(options)) {
      var newOptions;
      
      options(function(opts) {
        newOptions = opts;
      }, this);
      
      html = this._getOptionsHtml(newOptions);
    }

    return html;
  },

  

  /**
   * Transforms a collection into HTML ready to use in the renderOptions method
   * @param {Backbone.Collection}
   * @return {String}
   */
  _collectionToHtml: function(collection) {
    //Convert collection to array first
    var array = [];
    collection.each(function(model) {
      array.push({ val: model.id, label: model.toString() });
    });

    //Now convert to HTML
    var html = this.renderOptions(array);

    return html;
  },

  /**
   * Create the <option> HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function(array) {
    var html = [];

    //Generate HTML
    _.each(array, function(option) {
      if (_.isObject(option)) {
        if (option.group) {
          html.push('<optgroup label="'+option.group+'">');
          html.push(this._getOptionsHtml(option.options))
          html.push('</optgroup>');
        } else {
          var val = (option.val || option.val === 0) ? option.val : '';
          html.push('<option value="'+val+'">'+option.label+'</option>');
        }
      }
      else {
        html.push('<option>'+option+'</option>');
      }
    }, this);

    return html.join('');
  }

});

/**
 * Radio editor
 *
 * Renders a <ul> with given options represented as <li> objects containing radio buttons
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Radio = Form.editors.Select.extend({

  tagName: 'ul',
  sel: 'input[type=radio]',

  type:'radio',
  val: function(val){
	  if(!val)return this.$('input[type=radio]:checked').val();
	  this.$('input[type=radio]').val([value]);
  },
  
  /**
   * Create the radio list HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function (array) {
    var html = [];
    var self = this;
    _.map(array, function(elem){if(_.isString(elem)){
    		elem = {'type':self.type,'val':elem,'label':elem}
    	}
    	return elem;});
    _.each(array, function(option, index) {
      var itemHtml = '<li>';
      var val = (option.val || option.val === 0) ? option.val : '';
      itemHtml += ('<input type="'+option.type+'" name="'+self.id+'" value="'+val+'" id="'+self.id+'-'+index+'" />');
      itemHtml += ('<label for="'+self.id+'-'+index+'">'+option.label+'</label>');
      
      itemHtml += '</li>';
      html.push(itemHtml);
    });

    return html.join('');
  }

});

/**
 * Checkboxes editor
 *
 * Renders a <ul> with given options represented as <li> objects containing checkboxes
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Checkboxes = Form.editors.Radio.extend({

	type:'checkbox',

	sel: 'input[type=checkbox]',
  getValue: function() {
    var values = [];
    this.$('input[type=checkbox]:checked').each(function() {
      values.push($(this).val());
    });
    return values;
  },

  setValue: function(values) {
    if (!_.isArray(values)) values = [values];
    this.$('input[type=checkbox]').val(values);
  },



 
});

