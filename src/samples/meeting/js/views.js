var ATagView = Backbone.View.extend({
	tagName: "a",
	initialize: function(option) {
		this.option = option;
		if (option.url){
			this.el.href = option.url;
		} else {
			this.el.href = "javascript:void(0);";
		}
		this.$el.text(option.value);
		option.parent.append(this.$el);
	},
	events: {
		"click": "clickEvent"
	},
	clickEvent: function() {
		var option = this.option;
		if (option.event){
			option.event();
		}
	}
});

var BtnView = Backbone.View.extend({
	tagName: "div",
	initialize: function(option) {
		this.$el.addClass("btn");
		this.$el.addClass(option.css || "");
		this.$el.text(option.value);
		this.$el.bind("click", option.event);
		option.parent.append(this.$el);
	}
});

var RadioView = Backbone.View.extend({
	tagName: "div",
	initialize: function(option) {
		this.option = option;
		this.$el.addClass("radio");
		this.$el.addClass(option.css || "");
		this.$el.text(option.value);
		option.parent.append(this.$el);
	},
	events: {
		"click": "clickEvent"
	},
	clickEvent: function() {
		var self = this,
			option = this.option;
		if (option.event) {
			option.event()
		} else {
			option.parent.find(".radio-visited").removeClass("radio-visited");
			self.$el.addClass("radio-visited");
		}
	}
});

var MenuView = Backbone.View.extend({
	tagName: "div",
	initialize: function (option) {
		this.option = option;
		this.$el.addClass("menu");
		this.$el.addClass(option.menuClass);
		option.parent.append(this.$el);
	},
	events: {
		"click": "clickEvent"
	},
	clickEvent: function () {
		this.option.event();
	}
});

var MenusView = Backbone.View.extend({
	tagName: "div",
	initialize: function (option) {
		this.$el.addClass("menus");
		option.parent.append(this.$el);
	}
});

var VideoView = Backbone.View.extend({
	tagName: "video",
	initialize: function (option) {
		this.$el.addClass("video");
		option.parent.append(this.$el);
	}
});

var RemoteView = Backbone.View.extend({
	tagName: "div",
	initialize: function (option) {
		this.render(option);
	},
	render: function (option) {
		var self = this;
		var menus = new MenusView({
			parent: self.$el
		});
		var vedio = new MenusView({
			parent: self.$el
		});
		var full = new MenuView({
			menuClass: "full",
			parent: menus.$el,
			event: function () {
				
			}
		});

		var audio = new MenuView({
			menuClass: "full",
			parent: menus.$el,
			event: function () {
				
			}
		});
	}
});