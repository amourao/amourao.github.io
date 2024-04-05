const VARS_TO_GET_DAILY = "temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum,wind_speed_10m_max,sunshine_duration";
const FRIENDLY_NAMES = {
    "temperature_2m_max": {
        "name": "Max Temp",
        "lower": "colder",
        "higher": "warmer",
        "metric": "&#186;C",
        "imperial": " F"
    },
    "temperature_2m_min": {
        "name": "Min Temp",
        "lower": "colder",
        "higher": "warmer",
        "metric": "&#186;C",
        "imperial": " F"
    },
    "rain_sum": {
        "name": "Rain",
        "lower": "drier",
        "higher": "rainier",
        "metric": " mm",
        "imperial": " inch"
    },
    "snowfall_sum": {
        "name": "Snow",
        "lower": "less snowy",
        "higher": "snowier",
        "metric": " mm",
        "imperial": " inch"
    },
    "wind_speed_10m_max": {
        "name": "Wind",
        "lower": "calmer",
        "higher": "windier",
        "metric": " km/h",
        "imperial": " mph",
    }, 
    "sunshine_duration": {
        "name": "Sunshine",
        "lower": "less sunny",
        "higher": "sunnier",
        "metric": " hours",
        "imperial": " hours",
    },
}

const VARS_TO_GET_HOURLY = "";
const METRIC="";
const IMPERIAL="temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"

const DATA_PATH = "data";
const SEPARATOR = "&nbsp;";
const COLORS = ["gray", "#004074", "red" /*"#00c0b1"*/, "#00c0b1"];
const SYMBOLS_RAW = ["#", "P", "#", "F"];
// zip colors and symbols
const SYMBOLS = SYMBOLS_RAW.map((x, i) => `<font title='%%%' color='${COLORS[i]}'>${x}</font>`);
const COLUMN_WIDTH = 3;


window.onload = function() {
    // catch exceptions
    document.getElementById("date").value = new Date().toISOString().slice(0, 10);
    // parse GET parameters
    const urlParams = new URLSearchParams(window.location.search);
    const latitude = urlParams.get('latitude');
    const longitude = urlParams.get('longitude');
    const location = urlParams.get('location');
    const date = urlParams.get('date');
    const delta = urlParams.get('delta');
    const years_to_get_history = urlParams.get('years_to_get_history');
    if (latitude && longitude) {
        document.getElementById("latitude").value = latitude;
        document.getElementById("longitude").value = longitude;
    }
    if (location) {
        document.getElementById("location").value = location;
    }
    if (date) {
        document.getElementById("date").value = date;
    }
    if (delta) {
        document.getElementById("delta").value = delta;
    }
    if (years_to_get_history) {
        document.getElementById("years_to_get_history").value = years_to_get_history;
    }

    if (((!latitude || !longitude)  && !location) && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            console.log(position);
            document.getElementById("latitude").value = position.coords.latitude.toFixed(2);
            document.getElementById("longitude").value = position.coords.longitude.toFixed(2);
            getWeather();
        });
    }
    getWeather();
}

window.onerror = function (msg, url, lineNo, columnNo, error) {
    // log errors
    document.getElementById("chart").innerHTML = "Error";
    console.log(msg, url, lineNo, columnNo, error);
    return false;
}

async function geocode(){
    const location = document.getElementById("location").value;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=10&format=json`
    const response = await fetch(url);
    const data = await response.json();
    if (data["results"].length > 0) {
        let result = data["results"][0]
        document.getElementById("latitude").value = result.latitude.toFixed(2);
        document.getElementById("longitude").value = result.longitude.toFixed(2);
        document.getElementById("location").value = result.name
    }
}

async function getWeather(){
    document.getElementById("chart").innerHTML = "Loading...";
    document.getElementById("summary").innerHTML = "";
    if (document.getElementById("location").value != "") {
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";
        await geocode();
    }
    
    if (document.getElementById("latitude").value == "" || document.getElementById("longitude").value == "") {
        document.getElementById("chart").innerHTML = "Location not found";
        return;
    }

    const latitude = parseFloat(document.getElementById("latitude").value);
    const longitude = parseFloat(document.getElementById("longitude").value);

    const dateString = document.getElementById("date").value;
    // parse YYYY-MM-DD to Date object
    const date = new Date(dateString);
    const delta = document.getElementById("delta").value;
    const years_to_get_history = document.getElementById("years_to_get_history").value;

    const units = document.getElementById("units").value;

    // update URL
    const url = new URL(window.location.href);
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('location', document.getElementById("location").value);
    url.searchParams.set('date', dateString);
    url.searchParams.set('delta', delta);
    url.searchParams.set('years_to_get_history', years_to_get_history);
    window.history.pushState({}, '', url);



    const current_date = new Date();
    // today or yesterday
    let current = null;
    let delta_starts = new Date()
    delta_starts.setDate(new Date().getDate()-parseInt(delta));
    let delta_ends = new Date()
    delta_ends.setDate(new Date().getDate()+parseInt(6));

    if (date > delta_ends) {
        // too far in the future
        document.getElementById('chart').innerHTML = "Date too far in the future";
        return;
    } else if (date.toISOString().slice(0, 10) >= current_date.toISOString().slice(0, 10)) {
        current = await getCurrentWeather([latitude, longitude], date, delta, units)
    } else if (date > delta_starts) {
        // delta is in days
        currentA = await getCurrentWeather([latitude, longitude], date, delta, units);
        currentB = await getHistoricalWeatherCurrent([latitude, longitude], date, delta, units);
        current = mergeCurrentHistorical(currentA, currentB, delta_starts.toISOString().slice(0, 10), delta_ends.toISOString().slice(0, 10));
    } else {
        current = await getHistoricalWeatherCurrent([latitude, longitude], date, delta, units);
    }
    const parsedData = splitPastPresentFuture(current, date);
    current = parsedData;

    const historical = await getHistoricalWeather([latitude, longitude], date, delta, years_to_get_history, units);
    const historical_grouped = groupByValue(historical);
    const historical_histogram = createHistogram(historical);
    const current_histograms = [...historical_histogram];
    for (var i = 0; i < current.length; i++) {
        current_histograms.push(...createHistogram([current[i]]));
    }
    const gg = groupHistogramsByValue(current_histograms);
    const varsToGetDaily = VARS_TO_GET_DAILY.split(",");
    
    let currentVal = getCurrentValue(current, date);
    document.getElementById('chart').innerHTML = "";
    document.getElementById('summary').innerHTML = "";

    for (const varName of varsToGetDaily) {
        let chart = createAsciiChart(varName, gg[varName], currentVal[varName], date, historical_grouped[varName]);
        document.getElementById('chart').innerHTML += chart;
    }

    for (const info of [["Selected day",1], ["Past weather",0], ["Forecast",2]]) {
        document.getElementById('summary').innerHTML += "<br>" + info[0] + ":<br>";
        let score = 0;
        let scoreSum = 0;
        var text = "";
        for (const varName of varsToGetDaily) {
            const datas = friendlyStats(historical_grouped[varName], current[info[1]]["daily"][varName], varName, units);
            text += "<li>" + datas[0] + "</li>\n";
            score += datas[1];
            scoreSum += datas[2];
        }
        document.getElementById('summary').innerHTML += "<b>Weirdther Score: " + (score/scoreSum*100).toFixed(0) + "</b><ul>" + text + "</ul>";
    }
}



function parseDate(dateString) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

function findPercentileForValue(data, value) {
    // find first index greater than value
    var firstIndex = data.findIndex((x) => x >= value);
    var lastIndex = data.findIndex((x) => x > value);

    if (firstIndex === -1 && lastIndex === -1) {
        return [1, firstIndex, lastIndex];
    }
    if (firstIndex === -1) {
        return [0, firstIndex, lastIndex];
    }
    if (lastIndex === -1) {
        return [0.5, firstIndex, lastIndex];
    }
    const percentile = (firstIndex+lastIndex) / 2 / data.length;
    return [percentile, firstIndex, lastIndex];

}

function getPercentile(data, percentile) {
    const index = Math.floor(data.length * percentile);
    return data[index];
}

function getMedian(data) {
    return getPercentile(data, 0.5);
}

function getMean(data) {
    return data.reduce((a, b) => a + b, 0) / data.length;
}

function getStd(data) {
    const mean = getMean(data);
    const sqDiffs = data.map((value) => Math.pow(value - mean, 2));
    const avgSqDiff = getMean(sqDiffs);
    return Math.sqrt(avgSqDiff);
}

// maxValues is a dict of varName -> value Count histogram
function maxValuesToValues(maxValues) {
    const values = [];
    for (var varName in maxValues) {
        for (var i = 0; i < maxValues[varName].length; i++) {
            values.push(parseInt(varName));
        }
    }
    return values;
}

function friendlyStats(data, current_series, var_name, unit_type) {
    var friendly_name = FRIENDLY_NAMES[var_name]["name"];
    data = data.sort((a, b) => parseFloat(a) - parseFloat(b));
    var mean = getMean(data);
    var median = getMedian(data);
    var series_percentile = [0, 0, 0]
    var series_mean = getMean(current_series);
    var series_median = getMedian(current_series);
    var score = 0, scoreSum = 0;
    for (var i = 0; i < current_series.length; i++) {
        const percentileData = findPercentileForValue(data, current_series[i]);
        series_percentile[0] += percentileData[0];
        series_percentile[1] += percentileData[1];
        series_percentile[2] += percentileData[2];
        const diff = Math.abs(percentileData[0] - 0.5);
         if (diff == 0.5) {
            score += diff*3;
        } else if (diff > 0.25) {
            score += diff*2;
        }

        scoreSum += 1;
    }
    series_percentile[0] /= current_series.length;
    series_percentile[1] /= current_series.length;
    series_percentile[2] /= current_series.length;

    if (var_name === "sunshine_duration") {
        mean /= 3600;
        median /= 3600;
        series_mean /= 3600;
        series_median /= 3600;
    }
    var qualifier = "";
    var boldStart = "";
    var boldEnd = "";
    var topOrBottom = "";
    var percentilePretty = `${(series_percentile[0]*100).toFixed(0)}%`;
    if (series_mean === 0 && var_name === "rain_sum" && series_percentile[0] > 0.25 && series_percentile[0] < 0.75) {
        return [`<b>${friendly_name}:</b> No rain expected, which is what is typical.`, 0, 0];
    } else if (series_percentile[1] == 0 && series_percentile[2] == -1) {
        return [`<b>${friendly_name}:</b> Not expected this time of year.`, 0, 0];
    } else if (series_percentile[0] == 0) {
        qualifier = "the minimum value recorded for the time period!";
        boldStart = "<b style='color:blue'>";
        boldEnd = "</b>";
    } else if (series_percentile[0] == 1) {
        qualifier = "the maximum value recorded for the time period!";
        boldStart = "<b style='color:red'>";
        boldEnd = "</b>";  
    } else if (series_percentile[0] < 0.05) {
        qualifier = "significantly " + FRIENDLY_NAMES[var_name]["lower"] + " than usual."
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Bottom " + percentilePretty;
    } else if (series_percentile[0] > 0.95) {
        qualifier = "significantly " + FRIENDLY_NAMES[var_name]["higher"] + " than usual."
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Top " + percentilePretty;
    } else if (series_percentile[0] < 0.25) {
        qualifier = FRIENDLY_NAMES[var_name]["lower"] + " than usual.";
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Bottom " + percentilePretty;
    } else if (series_percentile[0] > 0.75) {
        qualifier = FRIENDLY_NAMES[var_name]["higher"] + " than usual.";
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Top " + percentilePretty;
    }  else {
        qualifier = "close to what is expected.";
    }
    return [`<b>${friendly_name}:</b> ${boldStart}${series_mean.toFixed(2)}${FRIENDLY_NAMES[var_name][unit_type]} is ${qualifier} ${topOrBottom} Median ${median.toFixed(2)}${FRIENDLY_NAMES[var_name][unit_type]} ${boldEnd}`, score, scoreSum];
    
}

function printStats(data, current_value, var_name) {
    data = data.sort((a, b) => parseFloat(a) - parseFloat(b));
    var mean = getMean(data);
    var std = getStd(data);
    var median = getMedian(data);
    var p5 = getPercentile(data, 0.05);
    var p25 = getPercentile(data, 0.25);
    var p75 = getPercentile(data, 0.75);
    var p95 = getPercentile(data, 0.95);
    var percentile = findPercentileForValue(data, current_value);
    if (var_name === "sunshine_duration") {
        mean = mean / 3600;
        median = median / 3600;
        p5 = p5 / 3600;
        p25 = p25 / 3600;
        p75 = p75 / 3600;
        p95 = p95 / 3600;
        current_value = current_value / 3600;
    }
    return `mean: ${mean.toFixed(2)}, std: ${std.toFixed(2)}, 5%: ${p5.toFixed(2)}, 25%: ${p25.toFixed(2)}, 50%: ${median.toFixed(2)}, 75%: ${p75.toFixed(2)}, 95%: ${p95.toFixed(2)}<br>current value: ${current_value.toFixed(2)}, percentile: ${percentile[0].toFixed(2)}`;
}

async function getCurrentWeather(location = DEFAULT_LOCATION, current_date = new Date(), delta = DEFAULT_DELTA, unitsType = "metric") {
    // format location to three decimal places
    var unitString = METRIC
    if (unitsType === "imperial") {
        unitString = IMPERIAL
    }

    location = [location[0].toFixed(2), location[1].toFixed(2)];
    const key = `current-${current_date.toISOString().split('T')[0]}-${delta}-${location[0]}-${location[1]}-${unitsType}`;
    const storedData = localStorage.getItem(key);
    if (storedData) {
        return JSON.parse(storedData);
    }


    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location[0]}&longitude=${location[1]}&current=${VARS_TO_GET_HOURLY}&daily=${VARS_TO_GET_DAILY}&past_days=${delta}&${unitString}`;
    const response = await fetch(url);
    const data = await response.json();
    
    localStorage.setItem(key, JSON.stringify(data));
    return data;
}

function splitPastPresentFuture(data, current_date) {
    var daily = [{"daily": {}}, {"daily": {}}, {"daily": {}}];
    var vars = ("time," + VARS_TO_GET_DAILY).split(",");
    for (var k = 0; k < vars.length; k++) {
        var varName = vars[k] + "";
        for (var i = 0; i < daily.length; i++) {
            daily[i]["daily"][varName] = [];
        }
        for (var i = 0; i < data["daily"]["time"].length; i++) {
            var day = data["daily"]["time"][i];
            var today = current_date.toISOString().split('T')[0];
            if (day === today) {
                daily[1]["daily"][varName].push(data["daily"][varName][i]);
            } else if (today > day) {
                daily[0]["daily"][varName].push(data["daily"][varName][i]);
            } else {
                daily[2]["daily"][varName].push(data["daily"][varName][i]);
            }
        }
    }
    return daily;
}

async function getHistoricalWeatherCurrent(location, current_date = new Date(), delta = DEFAULT_DELTA, unitsType = "metric") {
    // format location to two decimal places
    var unitString = METRIC
    if (unitsType === "imperial") {
        unitString = IMPERIAL
    }

    location = [location[0].toFixed(2), location[1].toFixed(2)];

    const start = new Date(current_date.getTime() - delta * 24 * 60 * 60 * 1000);
    let end = new Date(current_date.getTime() + delta * 24 * 60 * 60 * 1000);
    if (end > new Date()) {
        end = new Date();
    }
    const key = `historical-current-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}-${location[0]}-${location[1]}-${unitsType}.json`;
    const storedData = localStorage.getItem(key);
    if (storedData) {
        return JSON.parse(storedData);
    }
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location[0]}&longitude=${location[1]}&start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}&daily=${VARS_TO_GET_DAILY}&${unitString}`;

    const response = await fetch(url);
    const data = await response.json();
    localStorage.setItem(key, JSON.stringify(data));
    return data;
}


async function getHistoricalWeather(location, current_date = new Date(), delta = DEFAULT_DELTA, years = DEFAULT_YEARS_TO_GET_HISTORY, unitsType = "metric") {
    // format location to two decimal places
    var unitString = METRIC
    if (unitsType === "imperial") {
        unitString = IMPERIAL
    }

    location = [location[0].toFixed(2), location[1].toFixed(2)];
    const datas = [];
    var current_date_to = new Date(current_date);
    for (let i = 0; i < years; i++) {
        if ((current_date_to.getFullYear() % 4 === 0 && current_date_to.getFullYear() % 100 !== 0) || current_date_to.getFullYear() % 400 === 0) {
            current_date_to.setDate(current_date_to.getDate() - 366);
        } else {
            current_date_to.setDate(current_date_to.getDate() - 365);
        }
        const start = new Date(current_date_to.getTime() - delta * 24 * 60 * 60 * 1000);
        const end = new Date(current_date_to.getTime() + delta * 24 * 60 * 60 * 1000);
        const key = `historical-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}-${location[0]}-${location[1]}-${unitsType}.json`;
        const storedData = localStorage.getItem(key);
        if (storedData) {
            datas.push(JSON.parse(storedData));
            continue;
        }
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location[0]}&longitude=${location[1]}&start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}&daily=${VARS_TO_GET_DAILY}&${unitString}`;
        const response = await fetch(url);
        const data = await response.json();
        localStorage.setItem(key, JSON.stringify(data));
        datas.push(data);
        
    }
    return datas;
}

function mergeCurrentHistorical(current, historical, start, end) {
    // merge current and historical data, without adding duplicates, and only for the given start and end dates
    // start with current data
    perValue = current["daily"]
    // add missing values from historical data
    for (var j = 0; j < historical["daily"]["time"].length; j++) {
        var day = historical["daily"]["time"][j];
        var vars = VARS_TO_GET_DAILY.split(",");
        var offset = perValue["time"].indexOf(day);
        if (offset === -1) {
            perValue["time"].push(day);
        }
        for (var k = 0; k < vars.length; k++) {
            var varName = vars[k] + "";
            var val = historical["daily"][varName][j];
            if (offset === -1) {
                perValue[varName].push(val);
            } else if (val !== null) {
                perValue[varName][offset] = val;
            }
        }
    }
    // remove values outside of start and end
    merged = {};
    for (var varName in perValue) {
        merged[varName] = [];
        for (var i = 0; i < perValue[varName].length; i++) {
            if (current["daily"]["time"][i] >= start && current["daily"]["time"][i] <= end) {
                merged[varName].push(perValue[varName][i]);
            }
        }
    }
    // sort by date
    for (var varName in merged) {
        merged[varName] = merged[varName].sort((a, b) => new Date(a) - new Date(b));
    }

    return {"daily": merged};
}

function groupByValue(datas) {
    var perValue = {};
    for (var i = 0; i < datas.length; i++) {
        var data = datas[i];
        for (var j = 0; j < data["daily"]["time"].length; j++) {
            var day = data["daily"]["time"][j];
            var vars = VARS_TO_GET_DAILY.split(",");
            for (var k = 0; k < vars.length; k++) {
                var varName = vars[k] + "";
                if (!(varName in perValue)) {
                    perValue[varName] = [];
                }
                if (varName in data["daily"]) {
                    var val = data["daily"][varName][j];
                    perValue[varName].push(val);
                }
            }
        }
    }
    return perValue;
}


function createHistogram(datas, current_date = null) {
    // group by value
    // sample {"latitude": 39.47276, "longitude": -8.589203, "generationtime_ms": 0.11706352233886719, "utc_offset_seconds": 0, "timezone": "GMT", "timezone_abbreviation": "GMT", "elevation": 42.0, "daily_units": {"time": "iso8601", "temperature_2m_max": "\u00b0C", "temperature_2m_min": "\u00b0C", "precipitation_sum": "mm", "rain_sum": "mm", "snowfall_sum": "cm"}, "daily": {"time": ["2000-01-25", "2000-01-26", "2000-01-27", "2000-01-28", "2000-01-29", "2000-01-30", "2000-01-31", "2000-02-01", "2000-02-02", "2000-02-03", "2000-02-04"], "temperature_2m_max": [11.2, 12.7, 12.3, 14.8, 14.6, 16.7, 16.8, 16.5, 14.9, 18.6, 18.4], "temperature_2m_min": [-0.8, 2.7, 3.2, 5.9, 4.2, 2.4, 5.1, 12.1, 10.2, 7.5, 7.3], "precipitation_sum": [0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 15.9, 0.0, 0.0, 0.0], "rain_sum": [0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 15.9, 0.0, 0.0, 0.0], "snowfall_sum": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}}
    var perValue = {};
    var currentData = {};

    for (var i = 0; i < datas.length; i++) {
        var data = datas[i];
        for (var j = 0; j < data["daily"]["time"].length; j++) {
            var day = data["daily"]["time"][j];
            var vars = VARS_TO_GET_DAILY.split(",");
            for (var k = 0; k < vars.length; k++) {
                var varName = vars[k] + "";
                var val = data["daily"][varName][j];
                if (varName === "sunshine_duration") {
                    val = val / 3600;
                }
                val = Math.round(val) + "";
                if (current_date && day == current_date.toISOString().slice(0, 10)) {
                    if (!(varName in currentData)) {
                        currentData[varName] = {};
                    }
                     currentData[varName][val] =[day];
                } else {
                    if (!(varName in perValue)) {
                        perValue[varName] = {};
                    }
                    if (varName in data["daily"]) {
                        if (!(val in perValue[varName])) {
                            perValue[varName][val] = [];
                        }
                        perValue[varName][val].push(day);
                    }
                }
            }
        }
    }
    return [perValue];
}

function groupHistogramsByValue(datas) {
    let perValue = {};

    // multiple series in the form outputted by groupByValue
    var i = 0;
    for (data in datas) {
        for (key in datas[data]) {
            if (!(key in perValue)) {
                perValue[key] = {};
            }
            var minValue = null;
            var maxValue = null;
            for (val in datas[data][key]){
                if (minValue === null || val < minValue) {
                    minValue = val;
                }
                if (maxValue === null || val > maxValue) {
                    maxValue = val;
                }
                if (!(val in perValue[key])) {
                    perValue[key][val] = [];
                }
                while (perValue[key][val].length < i) {
                    perValue[key][val].push([]);
                }
                perValue[key][val].push(datas[data][key][val]);
            }
        }
        i++;
    }
    for (key in perValue) {
        var data = perValue[key];

        let var_start = Math.min(...Object.keys(perValue[key]).map(Number));
        let var_end = Math.max(...Object.keys(perValue[key]).map(Number));
        // sort data by key
        for (let i = var_start; i <= var_end; i++) {
            if (!(i in perValue[key])) {
                perValue[key][i + ""] = [];
            }
        }
    }
    
    return perValue;
}



function createAsciiChart(name, groupedData, currentVal, currentDate, historical_grouped = null) {
    // print simple ascii chart, with one line per value
    if (Object.keys(groupedData).length === 0) {
        return;
    }
    let sortedHistoricalDataKeys = Object.keys(groupedData).sort((a, b) => parseInt(a) - parseInt(b));
    let maxValues = {};
    let symbols = {};
    let values = {};
    for (var i = 0; i < sortedHistoricalDataKeys.length; i++) {
        let varValues = groupedData[sortedHistoricalDataKeys[i]];
        symbols[sortedHistoricalDataKeys[i]] = [];
        values[sortedHistoricalDataKeys[i]] = [];
        var internalMax = 0;
        for (var j = 0; j < varValues.length; j++) {
            internalMax += varValues[j].length;
            // repeat symbol into array
            Array(varValues[j].length).fill(SYMBOLS[j % SYMBOLS.length]).forEach(function (x) { 
                symbols[sortedHistoricalDataKeys[i]].push(x);
            });
            
            for (var k = 0; k < varValues[j].length; k++) {
                values[sortedHistoricalDataKeys[i]].push(varValues[j][k]);
            }
        }
        maxValues[sortedHistoricalDataKeys[i] + ""] = internalMax;
    }
    let maxValue = Math.max(...Object.values(maxValues));
    
    // fill missing values
    let asciiTable = "";
    for (let i = maxValue; i > 0; i--) {
        let line = "|";
        if (i === maxValue) {
            line = "/";
        }
        
        for (let varName in sortedHistoricalDataKeys) {
            var varValues = sortedHistoricalDataKeys[varName];
           
            if (i <= maxValues[varValues]) {
                var value = values[varValues][i-1];
                line += SEPARATOR.repeat(COLUMN_WIDTH-1) + symbols[varValues][i-1].replace("%%%", value);
            } else {
                line += SEPARATOR.repeat(COLUMN_WIDTH);
            }
        }
        asciiTable += line + "<br>";
    }
    asciiTable += SEPARATOR +  "-".repeat(sortedHistoricalDataKeys.length*COLUMN_WIDTH) + "-><br>";
    let line = SEPARATOR;
    for (let varName in sortedHistoricalDataKeys) {
        varValues = sortedHistoricalDataKeys[varName];
        varValueString = varValues + "";
        line += SEPARATOR.repeat(COLUMN_WIDTH-varValueString.length) + varValueString;
    }
    line += "<br>" + SEPARATOR;
    for (let varName in sortedHistoricalDataKeys) {
        varValues = maxValues[sortedHistoricalDataKeys[varName]];
        varValueString = varValues + "";
        line += SEPARATOR.repeat(COLUMN_WIDTH-varValueString.length) + varValueString;
    }
    line += "<br>";
    const stats = printStats(historical_grouped, currentVal, name);
    return `${asciiTable}${line}${name}<br>${stats}<br></br>`;
}

function getCurrentValue(current, currentDate) {
    // get current value
    let currentVal = {};
    for (var i = 0; i < current.length; i++) {
        var index = current[i]["daily"]["time"].indexOf(currentDate.toISOString().slice(0, 10))
        if (index !== -1) {
            for (var varName in VARS_TO_GET_DAILY.split(",")) {
                varName = VARS_TO_GET_DAILY.split(",")[varName];
                currentVal[varName] = current[i]["daily"][varName][index];
            }
        }
    }
    return currentVal;
}
