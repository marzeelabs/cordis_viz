// Our dimensional charts
var bubbleChart = dc.bubbleChart('#dc-bubble');
var dataTable = dc.dataTable("#dc-table-graph");
var startChart = dc.barChart("#dc-start-chart");
var endChart = dc.barChart("#dc-end-chart");
var partnersChart = dc.pieChart("#dc-partners-chart");

// d3.json("projects.json", function(error, data) {
// d3.json("projects_1000.json", function(error, data) {
d3.json("projects_all.json", function(error, data) {

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

  var formatPartnerSlices = function(d) {
    switch(d.key) {
      case 1:
        return d.key;
      case 5:
        return '2-5';
      case 6:
        return '5+';
    }
  }

  var formatPartnerSliceTitles = function(d) {
    return formatPartnerSlices(d) + ': ' + d.value + ' projects'; 
  }

  // A nest operator, for grouping the project list.
  var nestByDate = d3.nest()
      .key(function(d) {
        return d3.time.month(d.date); 
      });

  var transitionDuration = 500;

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
    d.rcn = +d.rcn;
  });


  // Create the crossfilter for the relevant dimensions and groups.
  var facts = crossfilter(data);
  var all = facts.groupAll();

  var fundingGroup = facts.groupAll().reduceSum(function(d) { return d.funding; });

  // var countriesDimension = facts.dimension(function(d) { return d.leaderCountry; });
  // var countriesGroup = countriesDimension.group().reduceSum(function(d) { return 1; });

  // Dimensions needed
  var byRCN = facts.dimension(function (d) { return d.rcn; });

  var byFunding = facts.dimension(function (d) { return d.funding; });

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

  var byStartDate = facts.dimension(function (d) { return d3.time.month(d.date); });
  var byStartDateGroup = byStartDate.group(d3.time.month);

  var byEndDate = facts.dimension(function (d) { return d3.time.month(d.end_date); });
  var byEndDateGroup = byEndDate.group(d3.time.month);

  var byPartners = facts.dimension(function (d) {
    var length = d.participants.length;
    if (length == 1) {
      return 1;
    } else if (length <= 5) {
      return 5;
    } else {
      return 6;
    }
    // return d.participants.length;
  });
  var byPartnersGroup = byPartners.group();

  // Full overview
  dc.dataCount(".dc-data-count")
    .dimension(facts)
    .group(all);

  dc.numberDisplay(".dc-total-funding")
    .group(fundingGroup)
    .valueAccessor(function (d) { return d; })
    .formatNumber(function (d) { return formatEuro(d);} );

  // dc.numberDisplay(".dc-total-countries")
  //   .group(countriesGroup)
  //   .valueAccessor(function (d) { console.log(d); return d.value; });
  //   // .formatNumber(function (d) { return formatEuro(d);} );

  // The charts
  bubbleChart
    .width(850)
    .height(500)
    .dimension(byCountry)
    .group(byCountryGroup)
    .transitionDuration(transitionDuration)
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
    .transitionDuration(transitionDuration)
    .elasticRadius(true)
    .elasticY(true)
    .elasticX(true)
    .yAxisPadding("15%")
    .xAxisPadding("18%")
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
    .renderTitle(true);
    // .renderlet(function (chart) {
    //   // console.log(facts.groupAll().reduceSum(function(d) { return d.funding; }).value());
    //   // console.log('chart');
    //   // rowChart.filter(chart.filter());
    // })
    // .on("postRedraw", function (chart) {
    //   // renderAll();
    //   // console.log("POST REDRAW");
    //         // console.log(chart);
    //   // dc.events.trigger(function () {
    //   //   rowChart.filter(chart.filter());
    //   // });
    // });

  // Format values on the X axis
  // bubbleChart.xAxis().tickFormat(function (s) {
  //   return formatNumberPrefix(s);
  // });
  

  startChart.width(850)
    .height(120)
    .dimension(byStartDate)
    .group(byStartDateGroup)
    .transitionDuration(transitionDuration)
    .centerBar(true)
    .gap(2)
    // .filter([new Date(2006, 1, 1), new Date(2020, 2, 1)])
    .x(d3.time.scale()
        .domain([new Date(2006, 0, 1), new Date(2020, 3, 1)])
        .rangeRound([0, 10 * 90]))
    .yAxisLabel("Projects")
    .elasticY(true)
    .yAxis().ticks(0);
  
  endChart.width(850)
    .height(120)
    .dimension(byEndDate)
    .group(byEndDateGroup)
    .transitionDuration(transitionDuration)
    .centerBar(true)
    // .gap(1)
    .barPadding(-0.9)
    .outerPadding(0.05)
    // .filter([new Date(2006, 1, 1), new Date(2020, 2, 1)])
    .x(d3.time.scale()
        .domain([new Date(2006, 0, 1), new Date(2020, 3, 1)])
        .rangeRound([0, 10 * 90]))
    .yAxisLabel("Projects")
    .elasticY(true)
    .yAxis().ticks(0);

  partnersChart
    .height(200)
    .width(200)
    .radius(65)
    .transitionDuration(transitionDuration)
    .renderLabel(true)
    .minAngleForLabel(0.1)
    .label(formatPartnerSlices)
    .title(formatPartnerSliceTitles)
    .colors(d3.scale.category20c())
    .dimension(byPartners)
    .group(byPartnersGroup)
    .transitionDuration(500);
   
  dataTable.width(960)
    .height(800)
    .dimension(byFunding)
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
