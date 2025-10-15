const VARS_TO_GET_DAILY = "temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum,wind_speed_10m_max,sunshine_duration";
const FRIENDLY_NAMES = {
    "temperature_2m_max": {
        "name": "Max Temp",
        "lower": "colder",
        "higher": "warmer",
        "metric": "&#186;C",
        "imperial": " F",
        "metric_short": "&#186;C",
        "imperial_short": " F",
        "colors": ["blue", "white", "red"],
        "color_limits": [0, 50, 100],
    },
    "temperature_2m_min": {
        "name": "Min Temp",
        "lower": "colder",
        "higher": "warmer",
        "metric": "&#186;C",
        "imperial": " F",
        "metric_short": "&#186;C",
        "imperial_short": " F",
        "colors": ["blue", "white", "red"],
        "color_limits": [0, 50, 100]
    },
    "rain_sum": {
        "name": "Rain",
        "lower": "drier",
        "higher": "rainier",
        "metric": " mm",
        "imperial": " inch",
        "metric_short": " mm",
        "imperial_short": " inch",
        "colors": ["white", "blue"],
        "color_limits": [0, 99]
    },
    "snowfall_sum": {
        "name": "Snow",
        "lower": "less snowy",
        "higher": "snowier",
        "metric": " mm",
        "imperial": " inch",
        "metric_short": " mm",
        "imperial_short": " inch",
        "colors": ["white", "blue"],
        "color_limits": [0, 99]

    },
    "wind_speed_10m_max": {
        "name": "Wind",
        "lower": "calmer",
        "higher": "windier",
        "metric": " km/h",
        "imperial": " mph",
        "metric_short": " km/h",
        "imperial_short": " mph",
        "colors": ["blue", "lightgreen", "red"],
        "color_limits": [0, 50, 100],
    }, 
    "sunshine_duration": {
        "name": "Sunshine",
        "lower": "less sunny",
        "higher": "sunnier",
        "metric": "% of daylight hours",
        "imperial": " % of daylight hours",
        "metric_short": "%",
        "imperial_short": "%",
        "colors": ["gray", "yellow"],
        "color_limits": [0, 68]
    },
}

const VARS_TO_GET_HOURLY = "";
const METRIC="";
const IMPERIAL="temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"

const DATA_PATH = "data";
const SEPARATOR = "&nbsp;";
const COLORS = ["gray", "#004074", "red" /*"#00c0b1"*/, "#00c0b1"];
const SYMBOLS_RAW = ["#", "B", "S", "A"];
// zip colors and symbols
const SYMBOLS = SYMBOLS_RAW.map((x, i) => `<a href='###'><font title='%%%' color='${COLORS[i]}'>${x}</font></a>`);
const COLUMN_WIDTH = 3;
var SELF_LINK = null;


var LINEAR_SCALE = true;

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
        document.getElementById("location").value = "Using coordinates";
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
            document.getElementById("location").value = "Current location";
            getWeather();
        });
        return;
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
    if (data && data["results"] && data["results"].length > 0) {
        let result = data["results"][0]
        document.getElementById("latitude").value = result.latitude.toFixed(2);
        document.getElementById("longitude").value = result.longitude.toFixed(2);
        document.getElementById("geocode_result").innerHTML = result.name + ", " + result.admin1 + ", " + result.country;  
    }
}

async function getWeather(){
    document.getElementById("summary").innerHTML = "Loading...";
    document.getElementById("chart").innerHTML = "";
    if (document.getElementById("location").value != "" &&
        document.getElementById("location").value != "Current location" &&
        document.getElementById("location").value != "Using coordinates") {
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";
        await geocode();
    }
    
    if (document.getElementById("latitude").value == "" || document.getElementById("longitude").value == "") {
        document.getElementById("summary").innerHTML = "Location not found";
        return;
    }

    const latitude = parseFloat(document.getElementById("latitude").value);
    const longitude = parseFloat(document.getElementById("longitude").value);

    if (document.getElementById("location").value == "") {
        document.getElementById("location").value = "Using coordinates";
        document.getElementById("geocode_result").innerHTML = latitude + ", " + longitude;
    }

    if (document.getElementById("location").value == "Current location") {
        document.getElementById("location").value = "Current location";
        document.getElementById("geocode_result").innerHTML = "Current location (" + latitude + ", " + longitude + ")";
    }

    if (document.getElementById("location").value == "Using coordinates") {
        document.getElementById("geocode_result").innerHTML = latitude + ", " + longitude;
    }

    var dateString = document.getElementById("date").value;
    // parse YYYY-MM-DD to Date object
    var date = new Date(dateString);
    console.log(dateString, date);
    if (date == null || isNaN(date.getTime())) {
        date = new Date();
        dateString = date.toISOString().slice(0, 10);
        document.getElementById("date").value = dateString;
    }
    const delta = document.getElementById("delta").value;
    const years_to_get_history = document.getElementById("years_to_get_history").value;

    const units = document.getElementById("units").value;

    const location = document.getElementById("location").value;

    // update URL
    const url = new URL(window.location.href);
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    if (location != "Using coordinates" && location != "Current location") {
        url.searchParams.set('location', document.getElementById("location").value);
    }
    url.searchParams.set('date', dateString);
    url.searchParams.set('delta', delta);
    url.searchParams.set('years_to_get_history', years_to_get_history);
    url.searchParams.set('units', units);
    window.history.pushState({}, '', url);


    SELF_LINK = url;



    const current_date = new Date();
    // today or yesterday
    let current = null;
    let delta_starts = new Date()
    delta_starts.setDate(new Date().getDate()-parseInt(delta));
    let delta_ends = new Date()
    delta_ends.setDate(new Date().getDate()+parseInt(6));

    if (date > delta_ends) {
        // too far in the future
        document.getElementById('summary').innerHTML = "Date too far in the future";
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
        let chart = createAsciiChart(varName, gg[varName], currentVal[varName], date, historical_grouped[varName].slice());
        document.getElementById('chart').innerHTML += chart;
    }

    for (const info of [["Selected day",1], ["Days before",0], ["Days after",2]]) {
        if (current[info[1]]["daily"]["time"].length == 0) {
            continue;
        }
        var days = current[info[1]]["daily"]["time"][0].replaceAll("-", "/");
        if (current[info[1]]["daily"]["time"].length > 1) {
            days += "-" + current[info[1]]["daily"]["time"][current[info[1]]["daily"]["time"].length-1].replaceAll("-", "/");
        }
        document.getElementById('summary').innerHTML += "<b>" + info[0] + ":</b> " + days + "<br>";
        let score = [];
        let scoreSum = [];
        let percentiles = [];
        for (var i = 0; i < current[info[1]]["daily"]["time"].length; i++) {
            score.push(0);
            scoreSum.push(1);
            percentiles.push(0);
        }
        var text = "";
        for (const varName of varsToGetDaily) {
            if (varName == "time") {
                continue;
            }
            const datas = friendlyStats(historical_grouped[varName], historical_grouped["time"], current[info[1]]["daily"][varName], current[info[1]]["daily"]["time"], varName, units, delta);
            if (datas.length == 0) {
                continue;
            }
            text += "<li>" + datas[0] + "</li>\n";
            for (var i = 0; i < datas[1].length; i++) {
                if (datas[1][i] > score[i] && varName != "sunshine_duration") {
                    score[i] = datas[1][i];
                    scoreSum[i] = datas[2][i];
                    percentiles[i] = datas[4][i];
                }
            }
            text += datas[3] + "\n";
        }
        for (var i = 0; i < score.length; i++) {
            score[i] = score[i] / scoreSum[i] * 100;
        }

        const sorted = score.slice().sort((a, b) => a - b);
        const max = Math.max(...score) / 100;
        const maxPercentile = Math.max(...percentiles);

        var scoreText = "";

        if (score.length == 1) {
            scoreText = score[0].toFixed(0);
        }

        if (score.length > 1) {
            scoreText = sorted[0].toFixed(0);
            scoreText += "-" + sorted[sorted.length-1].toFixed(0);
        }

        if (max < 0.75) {
            scoreText += " (what you signed up for";
        } else if (max < 0.98) {
            scoreText += " (elevator gossip worthy";
        } else if (max < 0.99) {
            scoreText += " (watch live on your local news channel";
        } else {
            scoreText += " (what you tell your grandkids about";
        }

        const message = generateOnceEveryXDays(maxPercentile);
        scoreText += message + ")";

        document.getElementById('summary').innerHTML += "<b>Weirdther Score:</b> " + scoreText + "<ul>" + text + "</ul>";
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
        return [0.999, firstIndex, lastIndex];
    }
    const percentile = (firstIndex+lastIndex) / 2 / data.length;
    return [percentile, firstIndex, lastIndex];

}


function findPercentileForSpan(data, value) {
    if (LINEAR_SCALE)
        return  [(value - data[0]) / (data[data.length-1] - data[0]), 0, 0];
    results = findPercentileForValue(data, value);
    if (results[2] == -1) {
        results[0] = 1;
    }
    return results;
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

function daysIntoYear(date){
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
}

function friendlyStats(data, data_days, current_series, current_series_days, var_name, unit_type, delta) {
    // deep copy data
    data = data.slice();
    data_days = data_days.slice();
    current_series = current_series.slice();
    current_series_days = current_series_days.slice();

    if (var_name === "sunshine_duration") {
        for (var i = 0; i < data.length; i++) {
            var correctionFactor = calculateDaylightCorrectionFactor(new Date(data_days[i])) * 36;
            data[i] /= correctionFactor;
        }
        for (var i = 0; i < current_series.length; i++) {
            var correctionFactor = calculateDaylightCorrectionFactor(new Date(current_series_days[i])) * 36;
            current_series[i] /= correctionFactor;
        }
        decimalPlaces = 0;
    }

    // starting day of the year
    var start_day_of_year = daysIntoYear(new Date(current_series_days[0])) - delta;
    // ending day of the year
    var end_day_of_year = daysIntoYear(new Date(current_series_days[current_series_days.length-1])) + delta;
    var friendly_name = FRIENDLY_NAMES[var_name]["name"];
    // sort data_days and data by the order of data 
    var combined = data_days.map((e, i) => [e, data[i]]);
    // add current series and current series days to combined
    combined = combined.concat(current_series_days.map((e, i) => [e, current_series[i]]));
    combined = combined.filter((e) => daysIntoYear(new Date(e[0])) >= start_day_of_year && daysIntoYear(new Date(e[0])) <= end_day_of_year && new Date(e[0]) < new Date(current_series_days[current_series_days.length-1])).sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
    data_days = combined.map((e) => e[0]);
    data = combined.map((e) => e[1]);



    var mean = getMean(data);
    var median = getMedian(data);
    var min = Math.min(...data);
    var max = Math.max(...data);
    var series_percentile = [0, 0, 0]
    var series_mean = getMean(current_series);
    var series_median = getMedian(current_series);
    var series_min_max = [Math.min(...current_series), Math.max(...current_series)];
    var scores = [];
    var scoresSum = [];
    var percentiles = [];
    var decimalPlaces = 1;



    for (var i = 0; i < current_series.length; i++) {
        const percentileData = findPercentileForValue(data, current_series[i]);
        series_percentile[0] += percentileData[0];
        series_percentile[1] += percentileData[1];
        series_percentile[2] += percentileData[2];
        const diff = Math.abs(percentileData[0] - 0.5);
        percentiles.push(diff+0.5);
        score = diff;
        if (diff > 0.3) {
            score = diff * 2;
        }
        score = Math.pow(score, 2);
        scores.push(score);
        if (series_percentile[1] == 0 && series_percentile[2] == -1)
            scoresSum.push(0);
        else
            scoresSum.push(1);
    }
    series_percentile[0] /= current_series.length;
    series_percentile[1] /= current_series.length;
    series_percentile[2] /= current_series.length;

    if (series_min_max[0] === series_min_max[1]) {
        series_min_max = series_min_max[0].toFixed(decimalPlaces) + "";
    } else {
        series_min_max = series_min_max[0].toFixed(decimalPlaces) + "/" + series_mean.toFixed(decimalPlaces) + "/" + series_min_max[1].toFixed(decimalPlaces);
    }

    var gradient = generateSpan(current_series, current_series_days, data, data_days, var_name, unit_type);


    var qualifier = "";
    var boldStart = "";
    var boldEnd = "";
    var topOrBottom = "";
    var noteDays = "";
    var percentilePretty = `${(series_percentile[0]*100).toFixed(0)}%`;
    if (series_mean === 0 && var_name === "rain_sum" && series_percentile[0] > 0.25 && series_percentile[0] < 0.75) {
        return [`<b>${friendly_name}:</b> No rain expected, which is what is typical.`, scores, scoresSum, gradient, percentiles];
    } else if (series_percentile[1] == 0 && series_percentile[2] == -1) {
        // return [`<b>${friendly_name}:</b> Not expected this time of year.`, scores, scoresSum, gradient];
        return []
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
        noteDays = generateOnceEveryXDays(series_percentile[0]);
    } else if (series_percentile[0] > 0.95) {
        qualifier = "significantly " + FRIENDLY_NAMES[var_name]["higher"] + " than usual."
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Top " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0]);
    } else if (series_percentile[0] < 0.25) {
        qualifier = FRIENDLY_NAMES[var_name]["lower"] + " than usual.";
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Bottom " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0]);
    } else if (series_percentile[0] > 0.75) {
        qualifier = FRIENDLY_NAMES[var_name]["higher"] + " than usual.";
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Top " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0]);
    }  else {
        qualifier = "close to what is expected.";
    }


    //return [`<b>${friendly_name}:</b> ${boldStart}${series_min_max}${FRIENDLY_NAMES[var_name][unit_type]} is ${qualifier} ${topOrBottom} Historic median/mean ${median.toFixed(1)}/${mean.toFixed(1)}${FRIENDLY_NAMES[var_name][unit_type]} ${boldEnd}`, scores, scoresSum, gradient];
    return [`<b>${friendly_name}:</b> ${boldStart}${series_min_max}${FRIENDLY_NAMES[var_name][unit_type]} is ${qualifier} ${topOrBottom} ${boldEnd}`, scores, scoresSum, gradient, percentiles];
 
}

function printStats(data, current_value, var_name, current_date) {
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
        var correctionFactor = calculateDaylightCorrectionFactor(new Date(current_date)) * 36;
        mean = mean / correctionFactor;
        median = median / correctionFactor;
        std = std / correctionFactor;
        p5 = p5 / correctionFactor;
        p25 = p25 / correctionFactor;
        p75 = p75 / correctionFactor;
        p95 = p95 / correctionFactor;
        current_value = current_value / correctionFactor;
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location[0]}&longitude=${location[1]}&current=${VARS_TO_GET_HOURLY}&daily=${VARS_TO_GET_DAILY}&past_days=${delta}&${unitString}`;
    console.log("Fetching current weather from: " + url);
    const response = await fetch(url);
    const data = await response.json();
    
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

async function getWeatherData(start, end, location, unitsType, unitString) {
    var output = {};
    var i = 0;
    var missingDays = [];
    // if end > today, set end to today
    if (end > new Date()) {
        end = new Date();
    }
    for (var date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const key = `historical-${date.toISOString().split('T')[0]}-${location[0]}-${location[1]}-${unitsType}.json`;
        const storedData = localStorage.getItem(key);
        if (!storedData) {
            missingDays.push(new Date(date));
        }
        i++;
    }
    // while missingDays are consecutive, fetch them in one go
    while (missingDays.length > 0) {
        var internalStart = missingDays[0];
        var internalEnd = missingDays[0];
        for (var i = 1; i < missingDays.length; i++) {
            if (missingDays[i].getTime() === internalEnd.getTime() + 24 * 60 * 60 * 1000) {
                internalEnd = missingDays[i];
            } else {
                break;
            }
        }
        // remove from missingDays
        missingDays = missingDays.filter(day => day < internalStart || day > internalEnd);

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location[0]}&longitude=${location[1]}&start_date=${internalStart.toISOString().split('T')[0]}&end_date=${internalEnd.toISOString().split('T')[0]}&daily=${VARS_TO_GET_DAILY}&${unitString}`;
        console.log("Fetching missing days from: " + url);
        const response = await fetch(url);
        const data = await response.json();
        // iterate per day between start and end, if not in data, add null
        if (!data || !data.daily || !data.daily.time) {
            return {}
        }

        for (let i = 0; i < data.daily.time.length; i++) {
            var day = data.daily.time[i];
            const key = `historical-${day}-${location[0]}-${location[1]}-${unitsType}.json`;
            // build a copy of the data object, but only for this day
            var dayData = JSON.parse(JSON.stringify(data));
            dayData.daily = {};
            for (var varName in data.daily) {
                dayData.daily[varName] = [data.daily[varName][i]];
            }
            localStorage.setItem(key, JSON.stringify(dayData));
        }
    }

    var output = {};
    var i = 0;
    var missingDays = [];
    for (var date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const key = `historical-${date.toISOString().split('T')[0]}-${location[0]}-${location[1]}-${unitsType}.json`;
        const storedData = localStorage.getItem(key);

        if (!output.daily) {
            output = JSON.parse(storedData);
            i++;
            continue;
        }
        if (storedData) {
            var output_day = JSON.parse(storedData);
            for (var varName in output_day["daily"]) {
                if (!output.daily[varName]) {
                    output.daily[varName] = [];
                }
                // append arrays
                output.daily[varName].push(...output_day["daily"][varName]);
            }
        }
        i++;
    }

    // if today's key was fetched, removed stored key for today, to allow updating
    const todayKey = `historical-${new Date().toISOString().split('T')[0]}-${location[0]}-${location[1]}-${unitsType}.json`;
    localStorage.removeItem(todayKey);
    return output;
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
    return await getWeatherData(start, end, location, unitsType, unitString);
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

        const start = new Date(current_date_to.getTime() - delta * 24 * 60 * 60 * 1000);
        const end = new Date(current_date_to.getTime() + delta * 24 * 60 * 60 * 1000);        
        await getWeatherData(start, end, location, unitsType, unitString).then((data) => {
            if (data && data["daily"] && data["daily"]["time"] && data["daily"]["time"].length > 0) {
                datas.push(data);
            }
        });

        if ((current_date_to.getFullYear() % 4 === 0 && current_date_to.getFullYear() % 100 !== 0) || current_date_to.getFullYear() % 400 === 0) {
            current_date_to.setDate(current_date_to.getDate() - 366);
        } else {
            current_date_to.setDate(current_date_to.getDate() - 365);
        }
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
            if (!("time" in perValue)) {
                perValue["time"] = [];
            }
            perValue["time"].push(day);
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
                    var correctionFactor = calculateDaylightCorrectionFactor(new Date(day)) * 36;
                    val = val / correctionFactor;
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
                var url = SELF_LINK
                url.searchParams.set('date', value);
                line += SEPARATOR.repeat(COLUMN_WIDTH-1) + symbols[varValues][i-1].replace("%%%", value).replace("###", url)
            } else {
                line += SEPARATOR.repeat(COLUMN_WIDTH);
            }
        }
        asciiTable += line + "<br>";
    }
    asciiTable += SEPARATOR +  "-".repeat((sortedHistoricalDataKeys.length-1)*COLUMN_WIDTH) + "--><br>" + SEPARATOR;
    let line = "";
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
    const stats = printStats(historical_grouped, currentVal, name, currentDate);
    return `<div class="chart-container">${asciiTable}${line}${name}<br>${stats}<br></br></div>`;
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

function generateCssGradient(var_name, data) {
    let colorList = FRIENDLY_NAMES[var_name]["colors"];
    let colorListPercent = FRIENDLY_NAMES[var_name]["color_limits"];
    let output = [];
    for (var i = 0; i < colorList.length; i++) {
        let index = Math.floor((data.length-1) * colorListPercent[i]/100);
        let val = data[index];
        let position = (val - data[0]) / (data[data.length-1] - data[0]) * 100;
        output.push(`${colorList[i]} ${position}%`);
    }
    return `background: linear-gradient(to right, ${output.join(", ")});`;
}

function genBackground(text) {
    // generate text with white background, black text and border
    return `<div style="background-color: white; color: black; padding: 2px; border-radius: 1px;">${text}</div>`;
}

function generateSpan(current_series, current_series_days, historical_stats, historical_stats_days, var_name, unit_type) {
    let unit_label = FRIENDLY_NAMES[var_name][unit_type + "_short"]
    // put a point at 50% of the gradient
    var data_for_median = historical_stats.slice().concat(current_series);
    var days_for_median = historical_stats_days.slice().concat(current_series_days);
    // sort data_days and data by the order of data 
    var combined = days_for_median.map((e, i) => [e, data_for_median[i]]);
    combined = combined.sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
    
    days_for_median = combined.map((e) => e[0]);
    data_for_median = combined.map((e) => e[1]);

    if (data_for_median[0] === data_for_median[data_for_median.length-1]) {
        return "";
    }

    let gradient = generateCssGradient(var_name, data_for_median)


    let point = "⬜";    
    let points = "";
    let text = ""
    let textBottom = "";
    let textTop = "";
    let textTopTop = "";

    let stdDevsToShow = [0, 0.01, 0.05, 0.32, 0.50, 0.68, 0.95, 0.99, 1];
    let symbols = ["|", "", "", "", "|", "", "", "", "|"];
    for (var i = 0; i < stdDevsToShow.length; i++) {
        let index = Math.floor((historical_stats.length-1) * stdDevsToShow[i])
        let val = historical_stats[index];
        let date = historical_stats_days[index];
        var url = SELF_LINK
        url.searchParams.set('date', date);
        percentileData = findPercentileForSpan(data_for_median,  val);
        position = percentileData[0] * 100;
        let part1 = genBackground( val.toFixed(1))
        let part2 = genBackground((stdDevsToShow[i]*100).toFixed(0) + "%")
        textTop += `<span style="position: absolute; left: ${position}%; top: 0px; transform: translateX(-50%);"><a title="${date}" href="${url}">` + part1 + "</a></span>";
        textTopTop += `<span style="position: absolute; left: ${position}%; top: -10px; transform: translateX(-50%);">`+ part2 + "</span>";
        if (symbols[i] !== "") {
            points += `<span style="position: absolute; left: ${position}%; top: -5px; transform: translateX(-50%);">${symbols[i]}</span>`;
        }
    }

    for (var i = 0; i < current_series.length; i++) {
        const percentileData = findPercentileForSpan(data_for_median, current_series[i]);
        const day = current_series_days[i];
        const position = percentileData[0] * 100;
        // place the point at the right position, positions are relative to the gradient
        var url = SELF_LINK
        url.searchParams.set('date', day);
        var link = `<a href="${url}">${point}</a>`;
        points += `<span title="${day}" style="position: absolute; left: ${position}%; top: -5px; transform: translateX(-50%);">${link}</span>`;
        if (current_series.length == 1) {
            text += `<span style="position: absolute; left: ${position}%; top: 0px; transform: translateX(-50%);">` + current_series[i].toFixed(1) + unit_label + "</span>";
            const percentileDataSeries = findPercentileForValue(historical_stats, current_series[i]);
            const positionSeries = percentileDataSeries[0] * 100;
            const part1 = genBackground(positionSeries.toFixed(0) + "%");  
            textBottom += `<span style="position: absolute; left: ${position}%; top: 0px; transform: translateX(-50%);">` + part1 + "</span>";
        }
    }
    
    var bar = `<span style="position: relative; ${gradient}; width: 100%; height: 10px; display: inline-block;">${points}</span>`;
    var textBarBottom = `<span style="position: relative; width: 100%; height: 10px; display: inline-block;">${textBottom}</span>`;
    var textBar = `<span style="position: relative; width: 100%; height: 10px; display: inline-block;">${text}</span>`;
    var textBarTop = `<span style="position: relative; width: 100%; height: 20px; display: inline-block;">${textTop}</span>`;
    var textBarTopTop = `<span style="position: relative; width: 100%; height: 10px; display: inline-block;">${textTopTop}</span>`;


    return `<div style="padding: 10px;  width: 100%; display: inline-block;">` + textBarTopTop + "\n" + textBarTop + "\n" +bar + "\n" + textBar + "\n" + textBarBottom + "</div>";  
}

function generateOnceEveryXDays(percentile) {
    let percentilePretty = 1-(Math.abs(0.5-percentile))*2; 
    const days = Math.round(1/percentilePretty);
    var start = ", should happen ";
    if (days === 1) {
        return start + "every other day";
    }
    if (days === 7) {
        return start + "once per week";
    }
    if (days === 30) {
        return start + "once per month";
    }
    if (isNaN(days) || !isFinite(days)) {
        return ", never happened before!";
    }
    return start + `once every ${days} days`;
    
}

function calculateDaylightCorrectionFactor(day) {
    // Calculate the day of the year (1-365)
    var lat = parseFloat(document.getElementById("latitude").value);
    const start = new Date(day.getFullYear(), 0, 0);
    const diff = day - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    return calculateDayLength(lat, dayOfYear);
}

function calculateDayLength(latitude, dayOfYear) {
  const declination = 23.44 * Math.sin((360/365) * (284 + dayOfYear) * Math.PI/180);
  const latRad = latitude * Math.PI/180;
  const decRad = declination * Math.PI/180;
  
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  
  // Handle polar day/night
  if (cosHourAngle > 1) return 0;    // Polar night
  if (cosHourAngle < -1) return 24;  // Polar day
  
  const hourAngle = Math.acos(cosHourAngle) * 180/Math.PI;
  return (2/15) * hourAngle;
}
