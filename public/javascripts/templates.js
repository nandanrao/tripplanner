(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['trip'] = template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
  var helper, functionType="function", helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;
  return "<p class=\"trip\">"
    + escapeExpression(((helper = (helper = helpers.tripname || (depth0 != null ? depth0.tripname : depth0)) != null ? helper : helperMissing),(typeof helper === functionType ? helper.call(depth0, {"name":"tripname","hash":{},"data":data}) : helper)))
    + "hel!!!</p>\n<div id=\"directions\"></div>";
},"useData":true});
})();