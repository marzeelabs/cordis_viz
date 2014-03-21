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

// d3.json("projects.json", function(error, projects) {
// d3.json("projects_1000.json", function(error, projects) {
d3.json("projects_all.json", function(error, projects) {

  // Various formatters.
  var formatNumber = d3.format(",d"),
      formatChange = d3.format("+,d"),
      formatMonth = d3.time.format("%B %Y"),
      formatDate = d3.time.format("%B %d, %Y"),
      formatTime = d3.time.format("%I:%M %p");

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
  projects.forEach(function(d, i) {
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
  var project = crossfilter(projects);
  var all = project.groupAll();
      
  var date = project.dimension(function(d) { return d.date; });
  var dates = date.group(d3.time.day);
      
  var end_date = project.dimension(function(d) { return d.end_date; });
  var end_dates = end_date.group(d3.time.day);

  var index = project.dimension(function(d) { return d.rcn; });

  var byFunding = project.dimension(function (d) { return d.funding; });

  var byCountry = project.dimension(function(d) { return d.leaderCountry; });
  var byCountry2 = project.dimension(function(d) { return d.leaderCountry; });

  var byProjectCall = project.dimension(function (d) { return d.project_call; });

  var charts = [

    barChart()
        .dimension(date)
        .group(dates)
        .round(d3.time.day.round)
      .x(d3.time.scale()
        .domain([new Date(2006, 0, 1), new Date(2020, 3, 1)])
        .rangeRound([0, 10 * 90]))
        .filter([new Date(2006, 1, 1), new Date(2020, 2, 1)]),

    barChart()
        .dimension(end_date)
        .group(end_dates)
        .round(d3.time.day.round)
      .x(d3.time.scale()
        .domain([new Date(2006, 0, 1), new Date(2020, 3, 1)])
        .rangeRound([0, 10 * 90]))
        .filter([new Date(2006, 1, 1), new Date(2020, 2, 1)])
  ];


  // DC
  var bubbleChart = dc.bubbleChart('#dc-bubble');
  var dataTable = dc.dataTable("#dc-table-graph");

  // Dimensions needed
  var byCountry3 = project.dimension(function(d) { return d.leaderCountry; });
  // var byCountryGroup3 = byCountry3.group().reduceCount();
  var byCountryGroup3 = byCountry3.group().reduce(
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

  var index3 = project.dimension(function(d) { return d.rcn; });
  var indexGroup3 = index3.group();

  dataTable.width(800).height(800)
    .dimension(index3)
    .group(function(d) { return "List of all Selected Businesses"
     })
    .size(10)
    .columns([
        function(d) { return d.project_acronym; },
        // function(d) { return d.project_call; },
        function(d) { return d.funding.formatMoney(0); }
        // function(d) { return d.review_count; },
        // function(d) { return '<a href=\"http://maps.google.com/maps?z=12&t=m&q=loc:' + d.latitude + '+' + d.longitude +"\" target=\"_blank\">Map</a>"}
    ])
    .sortBy(function(d){ return d.funding; })
    // (optional) sort order, :default ascending
    .order(d3.descending);

  bubbleChart.width(850)
    .height(500)
    .dimension(byCountry3)
    .group(byCountryGroup3)
    .transitionDuration(1500)
    .colors(d3.scale.category10())
    .x(d3.scale.linear())
    .y(d3.scale.linear())
    .maxBubbleRelativeSize(0.15)
    .keyAccessor(function (p) {
      // X axis
      // return p.value.totalFunding;
      return p.value.totalProjects;
    })
    .valueAccessor(function (p) {
      // Y axis
      return p.value.avgPartners;
    })
    .radiusValueAccessor(function (p) {
      // return p.value.totalProjects;
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

  // bubbleChart.yAxis().tickFormat(function (s) {
  //   return s + " partners";
  // });
  bubbleChart.xAxis().tickFormat(function (s) {
    return formatEuro(s);
    // return s + "M";
  });




  dc.renderAll();


  // // The map
  // var map = new L.Map("map", {center: [48, 9], zoom: 3})
  //   .addLayer(new L.TileLayer("http://{s}.tile.cloudmade.com/{key}/997/256/{z}/{x}/{y}.png", {
  //     attribution: '<b>Developed by <a href="http://openconsortium.eu/" target="_blank" class="oc-logo">Open Consortium</a>.</b> Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
  //     // key: '03d33ad133d34ae39b3990819a502f17',
  //     key: 'c8744de7fa7944169afa48842c7fcbdb',
  //     // styleId: 22677
  //     // styleId: 997,
  //     maxZoom: 18,
  //   }));

  // var markers = L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:40});
  // var markers_list = {};
  // map.addLayer(markers);

  // Given our array of charts, which we assume are in the same order as the
  // .chart elements in the DOM, bind the charts to the DOM and render them.
  // We also listen to the chart's brush events to update the display.
  var chart = d3.selectAll(".chart")
      .data(charts)
      .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

  // Render the initial lists.
  var list = d3.selectAll("#project-list")
      .data([projectList]);

  // Render the initial country list
  var listCountries = d3.select("#country-list")
      .data([countryList]);

  var listProjectCalls = d3.select('#project-calls-list')
    .data([projectCallList]);

  // Render the total.
  d3.selectAll("#total")
      .text(formatNumber(project.size()));

  renderAll();

  // Renders the specified chart or list.
  function render(method) {
    d3.select(this).call(method);
  }

  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
    chart.each(render);
    list.each(render);
    listCountries.each(render);
    listProjectCalls.each(render);
    // mapData();

    // Update counts
    d3.select("#active").text(formatNumber(all.value()));
    d3.select("#total-funding").text(project.groupAll().reduceSum(function(d) { return d.funding; }).value().formatMoney(0));

    countries = 0;
    byCountry2.group().top(Infinity).forEach(function(d) {
      if (d.value > 0) {
        countries++;
      } 
    });
    d3.select("#total-countries").text(countries);


    // Make our DC
    // dc.redrawAll();
  }

  function dateMonthDifference(d1, d2) {
    return d2.getMonth() - d1.getMonth() + 
            (12 * (d2.getFullYear() - d1.getFullYear()));
  }

  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

  // This gets triggered by the country click and reduces data
  window.filterCountry = function(country) {
    byCountry.filter(country);
    renderAll();
  };

  window.filterProjectCall = function(call) {
    byProjectCall.filter(call);
    renderAll();
  }

  window.reset = function(i) {
    charts[i].filter(null);
    renderAll();
  };

  // window.resetAll = function() {
  //   charts.each(filter(null));
  // }

  window.showModal = function(rcn) {
    index.filter(rcn);
    index.top(Infinity).forEach(function(p,i) {
      d3.select('#datapointevent').text(p.title);
    });
    index.filterAll(null);
    $('#myModal').modal('toggle');
    window.history.replaceState("", "title", "?rcn="+rcn);

  };

  function mapData() {
    markers.clearLayers();

    byFunding.top(50).forEach(function(d, i) {
      leader = d.participants[0];
      if (leader && 'lat' in leader && 'lon' in leader) {
        var marker = L.marker([leader.lat, leader.lon]);
        markers.addLayer(marker);
      }
    });

    map.fitBounds(markers);
  }

  // // Filter data on cluster click
  // markers.on('clusterclick', function (a) {
  //   // console.log(a);

  //   selected = a.layer.getAllChildMarkers();
  //   // console.log(selected);
  //   // 
    

  //     selected.forEach(function (k) {
  //       console.log(k);
  //     });




  //   byLocation.filterFunction(function (d) {
  //     // console.log(d);
  //     // for
  //     // 
      

  //     // for (var k in selsected) {
  //       // if (d.lat = )
  //     // }
  //   });
  // });

  function countryList(div) {
    div.each(function() {

      var countries = d3.select(this).selectAll(".country")
        .data(byCountry2.group().reduceCount().top(Infinity), function(d) {

          return d.key;

          // Only consider valid groups 
          if (d.value > 0) {
            return d.key;
          } else {
            return -1;
          }        
      });

      var countriesEnter = countries.enter()
        .append("li")
        .attr("class", "country")
        .append("a")
        .attr("class", "title")
        .attr('href', '#')
        .attr('onclick', function(d) { 
          return ("javascript:filterCountry('"+d.key+"');return false;"); 
        })
        .text(function(d) { return d.key+" ("+d.value+")"; });

      countries.exit().remove();
      countries.order();

      // Add support for list search & pagination
      var list = new List('country-list-wrapper', {
        valueNames: [ 'title' ],
        page: 10,
        plugins: [ ListPagination({})]
      });

    });
  }

  function projectCallList(div) {
    div.each(function() {
      var projectCalls = d3.select(this).selectAll(".project-call")
        .data(byProjectCall.group().top(Infinity), function(d) {
          return d.key;
      });

      var enter = projectCalls.enter()
        .append("li")
        .attr("class", "project-call")
        .append("a")
        .attr("class", "title")
        .attr('href', '#')
        .attr('onclick', function(d) { 
          return ("javascript:filterProjectCall('"+d.key+"');return false;"); 
        })
        .text(function(d) { return d.key+" ("+d.value+")"; });

      projectCalls.exit().remove();
      projectCalls.order();

      // Add support for list search & pagination
      var list = new List('project-calls-list-wrapper', {
        valueNames: [ 'title' ],
        page: 10,
        plugins: [ ListPagination({})]
      });


    });    
  }

  function projectList(div) {
    var projectsByDate = nestByDate.entries(date.top(50));

    div.each(function() {

      // console.log(d3.select(this).selectAll(".date"));


      var date = d3.select(this).selectAll(".date")
          .data(projectsByDate, function(d) { return d.key; });

      date.enter()
        .append("div")
        .attr("class", "date")
        .append("div")
        .attr("class", "day")
        .text(function(d) { return formatMonth(d.values[0].date); });

      date.exit().remove();

      var project = date.order().selectAll(".flight")
          .data(function(d) { return d.values; }, function(d) { return d.index; });

      var projectEnter = project.enter().append("div")
          .attr("class", "flight");

      projectEnter.append("div")
          .attr("class", "acronym")
          .append("a")
          // .attr("href", function(d) { return ("?rcn=" + d.rcn); })
          .attr("onclick",function(d) { return ("javascript:showModal('"+d.rcn+"'); return false;"); })
          .text(function(d) { return d.project_acronym; });

      projectEnter.append("div")
          .attr("class", "project-call")
          .text(function(d) { return d.project_call; });

      projectEnter.append("div")
          .attr("class", "funding")
          .text(function(d) {
            // var formatCurrency = d3.format("$,.0f");
            // return formatCurrency(d.funding);
            return (d.funding.formatMoney(0)); 
          });

      projectEnter.append("div")
          .attr('class', 'duration')
          .text(function(d) { return dateMonthDifference(d.date, d.end_date); });

      project.exit().remove();

      project.order();
    });
  }

  function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 20, left: 10},
        x,
        y = d3.scale.linear().range([100, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;

    function chart(div) {
      var width = x.range()[1],
          height = y.range()[0];

      y.domain([0, group.top(1)[0].value]);

      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");

        // Create the skeletal chart.
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");

          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          g.append("clipPath")
              .attr("id", "clip-" + id)
            .append("rect")
              .attr("width", width)
              .attr("height", height);

          g.selectAll(".bar")
              .data(["background", "foreground"])
            .enter().append("path")
              .attr("class", function(d) { return d + " bar"; })
              .datum(group.all());

          g.selectAll(".foreground.bar")
              .attr("clip-path", "url(#clip-" + id + ")");

          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);

          // Initialize the brush component with pretty resize handles.
          var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }

        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }

        g.selectAll(".bar").attr("d", barPath);
      });

      function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;
        while (++i < n) {
          d = groups[i];
          path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
        }
        return path.join("");
      }

      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }

    brush.on("brushstart.chart", function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
      var g = d3.select(this.parentNode),
          extent = brush.extent();
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));
      dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", "none");
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        dimension.filterAll();
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, "on");
  }
});
