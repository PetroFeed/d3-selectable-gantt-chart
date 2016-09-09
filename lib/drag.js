var Bar = require('./bar');
var OverlapDetector = require('./overlap.detector');

module.exports.enable = function (chartDataElement, opts, scales, selectedData, events) {
  function newTimeValue (date) {
    var currentX = scales.xScale(date);
    var newX = currentX + d3.event.dx;

    return {
      x: newX,
      time: scales.xScale.invert(newX).getTime() / 1000
    };
  }

  function onDragLeft (d) {
    var bar = new Bar(d);
    var newValue = newTimeValue(new Date(d.startedAt * 1000));
    var newBar = bar.expandLeft(newValue.time);

    if (newValue.time >= bar.endedAt) { return; }
    if (OverlapDetector.isOverlapping(newBar, events)) { return; }

    d.startedAt = newBar.startedAt;

    d3.select('rect.selected')
      .attr('x', newValue.x)
      .attr('width', scales.computeBarWidth);

    d3.select('rect#dragLeft')
      .attr('x', newValue.x - (dragBarSize / 2));

    opts.onBarChanged(newBar);
  }

  function onDragRight (d) {
    var bar = new Bar(d);
    var newValue = newTimeValue(new Date(d.endedAt * 1000));
    var newBar = bar.expandRight(newValue.time);

    if (newValue.time <= d.startedAt) { return; }
    if (OverlapDetector.isOverlapping(newBar, events)) { return; }

    d.endedAt = newBar.endedAt;

    d3.select('rect.selected')
      .attr('width', scales.computeBarWidth);

    d3.select('rect#dragRight')
      .attr('x', newValue.x - (dragBarSize / 2));

    opts.onBarChanged(newBar);
  }

  function onDragWhole (d) {
    var bar = new Bar(d);
    var newValue = newTimeValue(new Date(d.startedAt * 1000));
    var newBar = bar.move(newValue.time);
    var maxDateInSeconds = opts.maxDate.getTime() / 1000;

    if (newBar.endedAt > maxDateInSeconds) { return; }
    if (OverlapDetector.isOverlapping(newBar, events)) { return; }

    d.startedAt = newBar.startedAt;
    d.endedAt = newBar.endedAt;

    var rectWidth = scales.computeBarWidth(d);
    d3.select('rect.selected')
      .attr('x', newValue.x)
      .attr('width', rectWidth);

    d3.select('rect#dragLeft')
      .attr('x', newValue.x - (dragBarSize / 2));

    d3.select('rect#dragRight')
      .attr('x', newValue.x + rectWidth - (dragBarSize / 2));

    opts.onBarChanged(newBar);
  }

  var dragWhole = d3.behavior.drag()
    .origin(Object)
    .on('drag', onDragWhole);

  var dragLeft = d3.behavior.drag()
    .origin(Object)
    .on('drag', onDragLeft);

  var dragRight = d3.behavior.drag()
    .origin(Object)
    .on('drag', onDragRight);

  var selection = chartDataElement.append('g')
    .attr('id', 'selectionDragComponent')
    .selectAll('rect')
    .data([selectedData])
    .enter();

  d3.select('rect.selected')
    .attr('cursor', 'move')
    .call(dragWhole);

  var dragBarSize = 10;

  function dragBarX (fieldName) {
    return function x (d) {
      return scales.xScale(new Date(d[fieldName] * 1000)) - (dragBarSize / 2);
    };
  }

  var dragBarHeight = opts.barHeight - (opts.barPadding * 2);

  var dragBarLeft = selection.append('rect')
    .attr('x', dragBarX('startedAt'))
    .attr('y', scales.computeBarHeight)
    .attr('height', dragBarHeight)
    .attr('width', dragBarSize)
    .attr('id', 'dragLeft')
    .attr('fill', 'blue')
    .attr('fill-opacity', 0.3)
    .attr('cursor', 'ew-resize')
    .call(dragLeft);

  var dragBarRight = selection.append('rect')
    .attr('x', dragBarX('endedAt'))
    .attr('y', scales.computeBarHeight)
    .attr('height', dragBarHeight)
    .attr('width', dragBarSize)
    .attr('id', 'dragRight')
    .attr('fill', 'blue')
    .attr('fill-opacity', 0.3)
    .attr('cursor', 'ew-resize')
    .call(dragRight);
};

module.exports.disable = function () {
  var dragComponentSelection = d3.select('#selectionDragComponent');
  if (!dragComponentSelection.empty()) {
    dragComponentSelection.remove();
  }

  d3.selectAll('#chart-data .bar')
    .attr('cursor', 'auto')
    .on('.drag', null);
};