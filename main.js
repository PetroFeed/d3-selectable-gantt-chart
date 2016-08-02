function extractLabels (data) {
  function unique (value, index, array) {
    return array.indexOf(value) === index;
  }

  return data.map(function (d) { return d.label; })
             .filter(unique);
}

function toDate (timeInSeconds) {
  return new Date(timeInSeconds * 1000);
}

function defaultMinDate (data) {
  return d3.min(data.map(function (d) {
    return toDate(d.startedAt);
  }));
}

function defaultMaxDate (data) {
  return d3.max(data.map(function (d) {
    return toDate(d.endedAt);
  }));
}

function initialize (element, data, opts) {
  opts              = opts || {};
  opts.minDate      = opts.minDate || defaultMinDate(data);
  opts.maxDate      = opts.maxDate || defaultMaxDate(data);
  opts.leftPad      = opts.leftPad || 80;
  opts.barHeight    = opts.barHeight || 25;
  opts.xAxisHeight  = opts.xAxisHeight || 60;
  opts.margin       = { top: 200, right: 40, bottom: 200, left: 40 };
  opts.width        = element.clientWidth - opts.margin.left - opts.margin.right;
  opts.onBarClicked = opts.onBarClicked || function () {};
  opts.onBrush      = opts.onBrush || function() {};
  opts.onBrushEnd   = opts.onBrushEnd || function() {};

  return opts;
}

var brush = d3.svg.brush();

var clearBrush = function clearBrush() {
  d3.selectAll('rect.selected').classed('selected', false);
  d3.selectAll('#selectable-gantt-chart .brush').call(brush.clear());
};

var createChart = function createChart (element, data, opts) {
  opts               = initialize(element, data, opts);

  var labels         = extractLabels(data);
  var chartHeight    = labels.length * opts.barHeight;
  var svgHeight      = chartHeight + opts.xAxisHeight;
  var baseSVG        = d3.select(element)
                         .append('svg')
                         .attr('id', 'selectable-gantt-chart')
                         .attr('width', opts.width)
                         .attr('height', svgHeight);
  var chartData      = baseSVG.append('g').attr('id', 'chart-data');

  var timeScale = d3.time
                    .scale()
                    .domain([opts.minDate, opts.maxDate])
                    .range([opts.leftPad, opts.width])
                    .clamp(true);

  var labelsScale = d3.scale
                      .ordinal()
                      .domain(data.map(function(d) { return d.label; }))
                      .rangeRoundBands([1, chartHeight]);

  function isBarClicked(bar) {
    var y = d3.mouse(d3.select('g.brush').node())[1];

    var domain = labelsScale.domain();
    var range = labelsScale.range();

    var label = domain[d3.bisect(range, y) - 1];

    return (bar.label === label);
  }

  function brushed () {
    var timeRange  = brush.extent();
    var rects       = d3.selectAll('rect.bar');
    var brushStart = Math.floor(timeRange[0].getTime() / 1000);
    var brushEnd   = Math.floor(timeRange[1].getTime() / 1000);

    rects.each(function (bar) {
      bar.selected = false;

      function brushStartInsideBar () {
        return brushStart >= bar.startedAt && brushStart <= bar.endedAt;
      }

      function brushEndInsideBar () {
        return brushEnd >= bar.startedAt && brushEnd <= bar.endedAt;
      }

      function barInsideBrush () {
        return brushStart <= bar.startedAt && brushEnd >= bar.endedAt;
      }

      if (brushStartInsideBar() || brushEndInsideBar() || barInsideBrush()) {
        bar.selected = true;

        if (brush.empty()) {
          bar.selected = isBarClicked(bar);
        }
      }
    });


    rects.classed('selected', function (bar) {
      return bar.selected;
    });

    var selection = d3.selectAll('rect.selected');

    if (brush.empty()) {
      if (!selection.empty()) {
        opts.onBarClicked(selection.data()[0]);
      }
    } else {
      opts.onBrush(timeRange, selection.data());
    }
  }

  function brushEnded () {
    if (!brush.empty()) {
      opts.onBrushEnd(brush.extent(), d3.selectAll('rect.selected').data());
    }
  }

  brush.x(timeScale).on('brush', brushed);
  brush.x(timeScale).on('brushend', brushEnded);

  var xAxisOffset = chartHeight + 10;
  var xAxis = d3.svg.axis()
                    .ticks(d3.time.hours, 1)
                    .scale(timeScale)
                    .tickSize(xAxisOffset * -1, 0, 0);

  var yAxis = d3.svg.axis()
                    .tickPadding([10])
                    .orient('right')
                    .scale(labelsScale);

  baseSVG.append('g').attr('class', 'brush')
                     .attr('opacity', '.3')
                     .call(brush)
                     .selectAll('rect')
                     .attr('height', chartHeight);

  chartData.append('g')
           .attr('class', 'xaxis')
           .attr('transform', 'translate(0,' + xAxisOffset + ')')
           .call(xAxis);

  chartData.append('g')
           .attr('class', 'yaxis')
           .attr('transform', 'translate(0, 0)')
           .call(yAxis);

  chartData.selectAll('.yaxis line')
           .attr('stroke', 'black')
           .attr('x1', 0)
           .attr('x2', opts.width)
           .attr('y1', opts.barHeight / 2)
           .attr('y2', opts.barHeight / 2);

  chartData.append('g')
           .selectAll('rect')
           .data(data)
           .enter()
           .append('rect')
           .attr('class', 'bar')
           .attr('x', function (d) {
             return timeScale(new Date(d.startedAt * 1000));
           })
           .attr('y', function (d) {
             return labelsScale(d.label);
           })
           .attr('height', opts.barHeight)
           .attr('width', function (d) {
             var startedAt = new Date(d.startedAt * 1000);
             var endedAt = new Date(d.endedAt * 1000);

             return timeScale(endedAt) - timeScale(startedAt);
           });
};

module.exports = {
  create: createChart,
  clearBrush: clearBrush
};
