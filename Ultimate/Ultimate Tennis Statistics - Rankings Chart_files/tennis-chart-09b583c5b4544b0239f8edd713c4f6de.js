var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

function showRankingChart(chartData, elementId, width, bySeason, pointCount, isRank, useLogScale, legendPosition) {
	return showChart(chartData, elementId, width, bySeason, pointCount, isRank ? -1 : 1, isRank ? 1 : undefined, useLogScale, false, !bySeason, 0, legendPosition);
}

function showPerformanceChart(chartData, elementId, width, pointCount, isPct, legendPosition) {
	return showChart(chartData, elementId, width, true, pointCount, 1, 0, false, isPct, false, 0, legendPosition);
}

function showStatsChart(chartData, elementId, width, pointCount, isPct, legendPosition) {
	return showChart(chartData, elementId, width, true, pointCount, 1, 0, false, isPct, false, 0, legendPosition);
}

function showResultsChart(chartData, elementId, width, bySeason, pointCount, legendPosition) {
	return showChart(chartData, elementId, width, bySeason, pointCount, 1, 0, false, false, !bySeason, 5, legendPosition);
}

function showChart(chartData, elementId, width, bySeason, pointCount, vDir, vMin, useLogScale, isPct, interpolate, pointSize, legendPosition) {
	if (chartData !== undefined) {
		var options = {
			width: width,
			height: width / 2,
			chartArea: {left: 50, top: 20, height: "80%"},
			hAxis: {format: bySeason ? "####" : null, gridlines: pointCount < 5 ? { count: pointCount} : null},
			vAxis: {direction: vDir, viewWindow: {min: vMin}, logScale: useLogScale, format: isPct ? "percent" : null},
			interpolateNulls: interpolate,
			pointSize: pointSize,
			legend: {position: legendPosition}
		};
		var chart = new google.visualization.LineChart(document.getElementById(elementId));
		chart.draw(chartData, options);
		return chart;
	}
}

function useLogScale(json) {
	var min = Number.MAX_VALUE;
	var max = 0;
	for (var i = 0, ilen = json.rows.length; i < ilen; i++) {
		var row = json.rows[i];
		for (var j = 0, jlen = row.c.length; j < jlen; j++) {
			if (j > 0) {
				var value = row.c[j].v;
				if (value) {
					min = Math.min(min, value);
					max = Math.max(max, value);
				}
			}
		}
	}
	return max - min >= 50;
}

function defaultChartSize(device) {
	switch (device) {
		case "xs": return 600;
		case "sm": return 750;
		case "md": return 950;
		default: return 1000;
	}
}

function defaultChartWOLegendSize(device) {
	return device == "xs" ? 750 : 1000;
}

}
/*
     FILE ARCHIVED ON 12:58:11 May 19, 2024 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 20:07:34 Sep 21, 2025.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.76
  exclusion.robots: 0.028
  exclusion.robots.policy: 0.012
  esindex: 0.014
  cdx.remote: 606.79
  LoadShardBlock: 369.769 (3)
  PetaboxLoader3.resolve: 3599.309 (4)
  PetaboxLoader3.datanode: 295.453 (5)
  load_resource: 3724.902 (2)
*/