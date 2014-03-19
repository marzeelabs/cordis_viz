  var byCountry4 = project.dimension(function(d) { return d.leaderCountry; });
  var byCountryGroup4 = byCountry4.group().reduceSum(function (d) {
    return d.funding;
    // console.log(d);
  });

  var chart = dc.geoChoroplethChart("#europe-chart");


  d3.json("data/europe.json", function (jj) {
    

    // console.log(jj.features);


    var width = 960,
    height = 1160;
    var projection = d3.geo.mercator()
      .scale(500)
      .translate([width / 2, height / 2])
      .precision(.1);


    chart.width(width)
      .height(height)
      .dimension(byCountry4)
      .group(byCountryGroup4)
      .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
      .colorDomain([0, 200])
      .colorCalculator(function (d) { return d ? chart.colors()(d) : '#ccc'; })
      .overlayGeoJson(jj.features, "country", function (d) {
        return d.properties.ISO_A2;
      })
      .projection(projection)
      .title(function (d) {
        return d.key;
        // console.log(d);
        // return "State: " + d.key + "\nTotal Amount Raised: " + numberFormat(d.value ? d.value : 0) + "M";
    });
    
    // dc.renderAll();

  });