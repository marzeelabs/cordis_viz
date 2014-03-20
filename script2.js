// http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
Number.prototype.formatMoney = function(c, d, t){
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "," : d, 
    t = t == undefined ? "." : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

// Our dimensional charts
var bubbleChart = dc.bubbleChart('#dc-bubble');
var dataTable = dc.dataTable("#dc-table-graph");
  

d3.json("projects.json", function(error, data) {
// d3.json("projects_1000.json", function(error, data) {
// d3.json("projects_all.json", function(error, data) {

  // Various formatters.
  var formatNumber = d3.format(",d"),
      formatChange = d3.format("+,d"),
      formatMonth = d3.time.format("%B %Y"),
      formatDate = d3.time.format("%B %d, %Y"),
      formatTime = d3.time.format("%I:%M %p"),
      formatNumberPrefix = d3.format(".2s");

  var formatEuro = function(val) { 
    var si = d3.format(".2s");
    return si(val).replace(/G/, 'B');
  };

  // A nest operator, for grouping the project list.
  var nestByDate = d3.nest()
      .key(function(d) {
        return d3.time.month(d.date); 
      });

  // A little coercion, since the JSON is untyped. Also do some more data processing
  // to get everything ready for the crossfilter.
  data.forEach(function(d, i) {
    d.index = i;
    d.date = new Date(d.start_date * 1000);
    d.end_date = new Date(d.end_date * 1000);

    // Extract the leader country, this will used all over
    if (d.participants[0] && d.participants[0].country) {
      d.leaderCountry = d.participants[0].country;

      if ('lat' in d.participants[0] && 'lon' in d.participants[0]) {
        d.lat = d.participants[0].lat;
        d.lon = d.participants[0].lon;
      }
    }  else {
      d.leaderCountry = 'unknown';
    }

    d.funding = +d.funding;
    d.cost = +d.cost;
  });


  // Create the crossfilter for the relevant dimensions and groups.
  var facts = crossfilter(data);
  var all = facts.groupAll();

  // Full overview
  dc.dataCount(".dc-data-count")
    .dimension(facts)
    .group(all);

  // Dimensions needed
  var byRCN = facts.dimension(function (d) { return d.rcn; });

  var byCountry = facts.dimension(function(d) { return d.leaderCountry; });
  var byCountryGroup = byCountry.group().reduce(
    function (p,v) {
      ++p.totalProjects;
      p.totalFunding += v.funding;
      p.totalPartners += v.participants.length;
      p.avgPartners = p.totalPartners / p.totalProjects;
      return p;
    },
    function (p,v) {
      --p.totalProjects;
      p.totalFunding -= v.funding;
      p.totalPartners -= v.participants.length;
      p.avgPartners = p.totalPartners / p.totalProjects;
      return p;
    },
    function () {
      return {
        totalProjects: 0,
        totalFunding: 0,
        totalPartners: 0,
        avgPartners: 0,
      }
    }
  );

  // The charts
  bubbleChart
    .width(850)
    .height(500)
    .dimension(byCountry)
    .group(byCountryGroup)
    .transitionDuration(1500)
    .colors(d3.scale.category10())
    .x(d3.scale.linear())
    .y(d3.scale.linear())
    .maxBubbleRelativeSize(0.15)
    .keyAccessor(function (p) {
      // X axis
      return p.value.totalProjects;
    })
    .valueAccessor(function (p) {
      // Y axis
      return p.value.avgPartners;
    })
    .radiusValueAccessor(function (p) {
      return p.value.totalFunding;
    })
    .colorAccessor(function (p) {
      return p.value.totalFunding;
    })
    .transitionDuration(1500)
    .elasticRadius(true)
    .elasticY(true)
    .elasticX(true)
    .yAxisPadding("10%")
    .xAxisPadding("15%")
    .xAxisLabel('Total number of projects')
    .yAxisLabel('Average number of partners')
    .label(function (p) {
      return p.key;
    })
    .title(function (p) {
      var numberFormat = d3.format("$.2r");
      return p.key 
        + "\n" 
        + "Total projects: " + p.value.totalProjects + "\n" 
        + "Total funding: " + formatEuro(p.value.totalFunding) + "\n"
        + "Average number of partners: " + formatEuro(p.value.avgPartners) + "\n";
    })
    .renderLabel(true)
    .renderTitle(true)
    .renderlet(function (chart) {
      // console.log(chart);
      // rowChart.filter(chart.filter());
    })
    .on("postRedraw", function (chart) {
      // renderAll();
      // console.log("POST REDRAW");
            // console.log(chart);
      // dc.events.trigger(function () {
      //   rowChart.filter(chart.filter());
      // });
    });

  // Format values on the X axis
  // bubbleChart.xAxis().tickFormat(function (s) {
  //   return formatNumberPrefix(s);
  // });
  
  dataTable.width(960)
    .height(800)
    .dimension(byRCN)
    .group(function(d) { return ''; })
    .size(50)
    .columns([
      function(d) { return '<a href="' + d.url + '" target="_blank">' + d.project_acronym + '</a>'; },
      function(d) { return d.leaderCountry; },
      function(d) { return formatMonth(d.date); },
      function(d) { return formatMonth(d.end_date); },
      function(d) { return d.rcn; },
      function(d) { return formatEuro(d.funding); }
    ])
    .sortBy(function(d) { return d.funding; })
    .order(d3.descending);

  // Render all!
  dc.renderAll();

});
