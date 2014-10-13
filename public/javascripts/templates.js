(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['alternates'] = template({"1":function(depth0,helpers,partials,data) {
  var lambda=this.lambda, escapeExpression=this.escapeExpression;
  return "<li class=\"alternate\" data-google-id=\""
    + escapeExpression(lambda((depth0 != null ? depth0.id : depth0), depth0))
    + "\"><span class=\"name\">"
    + escapeExpression(lambda((depth0 != null ? depth0.name : depth0), depth0))
    + "</span><span class=\"address\">"
    + escapeExpression(lambda((depth0 != null ? depth0.vicinity : depth0), depth0))
    + "</span></li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var stack1, buffer = "";
  stack1 = helpers.each.call(depth0, (depth0 != null ? depth0.otherResults : depth0), {"name":"each","hash":{},"fn":this.program(1, data),"inverse":this.noop,"data":data});
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"useData":true});
templates['place'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<li class=\"place\" data-place-id=\""
    + escapeExpression(((helper = (helper = helpers._id || (depth0 != null ? depth0._id : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"_id","hash":{},"data":data}) : helper)))
    + "\" style=\"order: "
    + escapeExpression(((helper = (helper = helpers.pos || (depth0 != null ? depth0.pos : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"pos","hash":{},"data":data}) : helper)))
    + "\"><span class=\"name\">"
    + escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"name","hash":{},"data":data}) : helper)))
    + "</span> <span class=\"address\"></span></li>";
},"useData":true});
templates['trip'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  return "<div id=\"directions\"></div>\n<div class=\"main\">\n  <ul class=\"places\" id=\"places\"></ul>\n  <form action=\"\" id=\"inputForm\">\n  <input type=\"text\" name=\"input\" id=\"input\" autofocus>\n  </form>\n  <button id=\"calculate\">Calculate</button>\n</div>\n\n";
  },"useData":true});
})();