const VARS_TO_GET_DAILY = "temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum";
const VARS_TO_GET_HOURLY = "";

const DATA_PATH = "data";
const SEPARATOR = "&nbsp;";
const COLORS = ["gray", "blue", "red"];
const SYMBOLS_RAW = ["#", "%", "@"];
// zip colors and symbols
const SYMBOLS = SYMBOLS_RAW.map((x, i) => `<font title='%%%' color='${COLORS[i]}'>${x}</font>`);
const COLUMN_WIDTH = 3;


window.onload = function() {
    // catch exceptions
    document.getElementById("date").value = new Date().toISOString().slice(0, 10);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            console.log(position);
            document.getElementById("latitude").value = position.coords.latitude.toFixed(2);
            document.getElementById("longitude").value = position.coords.longitude.toFixed(2);
            getWeather();
        });
    }
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
        document.getElementById("location").value = result.name + ", " + result.admin1 + ", " + result.country;
    }
}

async function getWeather(){
    document.getElementById("chart").innerHTML = "Loading...";
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

    const current_date = new Date();
    // today or yesterday
    let current = null;
    let delta_starts = new Date()
    delta_starts.setDate(new Date().getDate()-parseInt(delta));
    let delta_ends = new Date()
    delta_ends.setDate(new Date().getDate()+parseInt(delta));

    if (date > delta_ends) {
        // too far in the future
        document.getElementById('chart').innerHTML = "Date too far in the future";
        return;
    } else if (date.toISOString().slice(0, 10) >= current_date.toISOString().slice(0, 10)) {
        current = await getCurrentWeather([latitude, longitude], date, delta);
    } else if (date > delta_starts) {
        // delta is in days
        currentA = await getCurrentWeather([latitude, longitude], date, delta);
        currentB = await getHistoricalWeatherCurrent([latitude, longitude], date, delta);
        current = mergeCurrentHistorical(currentA, currentB, delta_starts.toISOString().slice(0, 10), delta_ends.toISOString().slice(0, 10));
    } else {
        current = await getHistoricalWeatherCurrent([latitude, longitude], date, delta);
    }

    const historical = await getHistoricalWeather([latitude, longitude], date, delta, years_to_get_history);
    const historical_grouped = groupByValue(historical);
    const historical_histogram = createHistogram(historical);
    const current_histogram = createHistogram([current], date);
    const gg = groupHistogramsByValue([...historical_histogram, ...current_histogram]);
    const varsToGetDaily = VARS_TO_GET_DAILY.split(",");
    
    let currentVal = getCurrentValue(current, date);
    document.getElementById('chart').innerHTML = "";
    for (const varName of varsToGetDaily) {
        let chart = createAsciiChart(varName, gg[varName], currentVal[varName], date, historical_grouped[varName]);
        document.getElementById('chart').innerHTML += chart;
    }
}


function parseDate(dateString) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

function findPercentileForValue(data, value) {
    // find closest value in data
    const index = data.findIndex((x) => x >= value);
    if (index === -1) {
        if (value < data[0]) {
            return 0;
        }

        if (value > data[data.length - 1]) {
            return 1;
        }
    }
    return index / data.length;
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

function printStats(data, current_value) {
    data = data.sort((a, b) => parseFloat(a) - parseFloat(b));
    const mean = getMean(data);
    const std = getStd(data);
    const median = getMedian(data);
    const p5 = getPercentile(data, 0.05);
    const p25 = getPercentile(data, 0.25);
    const p75 = getPercentile(data, 0.75);
    const p95 = getPercentile(data, 0.95);
    const percentile = findPercentileForValue(data, current_value);
    return `mean: ${mean.toFixed(2)}, std: ${std.toFixed(2)}, 5%: ${p5.toFixed(2)}, 25%: ${p25.toFixed(2)}, 50%: ${median.toFixed(2)}, 75%: ${p75.toFixed(2)}, 95%: ${p95.toFixed(2)}<br>current value: ${current_value.toFixed(2)}, percentile: ${percentile.toFixed(2)}`;
}

async function getCurrentWeather(location = DEFAULT_LOCATION, current_date = new Date(), delta = DEFAULT_DELTA) {
    // format location to three decimal places
    location = [location[0].toFixed(2), location[1].toFixed(2)];
    const key = `current-${current_date.toISOString().split('T')[0]}-${delta}-${location[0]}-${location[1]}`;
    const storedData = localStorage.getItem(key);
    if (storedData) {
        return JSON.parse(storedData);
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location[0]}&longitude=${location[1]}&current=${VARS_TO_GET_HOURLY}&daily=${VARS_TO_GET_DAILY}&past_days=${delta}`;
    const response = await fetch(url);
    const data = await response.json();
    localStorage.setItem(key, JSON.stringify(data));
    return data;
}

async function getHistoricalWeatherCurrent(location, current_date = new Date(), delta = DEFAULT_DELTA) {
    // format location to two decimal places
    location = [location[0].toFixed(2), location[1].toFixed(2)];

    const start = new Date(current_date.getTime() - delta * 24 * 60 * 60 * 1000);
    let end = new Date(current_date.getTime() + delta * 24 * 60 * 60 * 1000);
    if (end > new Date()) {
        end = new Date();
    }
    const key = `historical-current-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}-${location[0]}-${location[1]}.json`;
    const storedData = localStorage.getItem(key);
    if (storedData) {
        return JSON.parse(storedData);
    }
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location[0]}&longitude=${location[1]}&start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}&daily=${VARS_TO_GET_DAILY}`;

    const response = await fetch(url);
    const data = await response.json();
    localStorage.setItem(key, JSON.stringify(data));
    return data;
}


async function getHistoricalWeather(location, current_date = new Date(), delta = DEFAULT_DELTA, years = DEFAULT_YEARS_TO_GET_HISTORY) {
    // format location to two decimal places
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
        const key = `historical-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}-${location[0]}-${location[1]}.json`;
        const storedData = localStorage.getItem(key);
        if (storedData) {
            datas.push(JSON.parse(storedData));
            continue;
        }
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location[0]}&longitude=${location[1]}&start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}&daily=${VARS_TO_GET_DAILY}`;
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
                if (current_date && day == current_date.toISOString().slice(0, 10)) {
                    var val = data["daily"][varName][j];
                    val = Math.round(val) + "";
                    if (!(varName in currentData)) {
                        currentData[varName] = {};
                    }
                     currentData[varName][val] =[day];
                } else {
                    if (!(varName in perValue)) {
                        perValue[varName] = {};
                    }
                    if (varName in data["daily"]) {
                        var val = data["daily"][varName][j];
                        val = Math.round(val) + "";
                        if (!(val in perValue[varName])) {
                            perValue[varName][val] = [];
                        }
                        perValue[varName][val].push(day);
                    }
                }
            }
        }
    }


    if (!current_date) {
        return [perValue];
    } else {
        return [perValue, currentData];
    }
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
            if (varValues[j][0] === currentDate.toISOString().slice(0, 10)) {
                Array(varValues[j].length).fill(SYMBOLS[SYMBOLS.length - 1]).forEach(function (x) { 
                    symbols[sortedHistoricalDataKeys[i]].push(x);
                });
            } else {
                Array(varValues[j].length).fill(SYMBOLS[j % SYMBOLS.length]).forEach(function (x) { 
                    symbols[sortedHistoricalDataKeys[i]].push(x);
                });
            }
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
    const stats = printStats(historical_grouped, currentVal);
    return `${asciiTable}${line}${name}<br>${stats}<br></br>`;
}

function getCurrentValue(current, currentDate) {
    // get current value
    let currentVal = {};
    for (var varName in VARS_TO_GET_DAILY.split(",")) {
        varName = VARS_TO_GET_DAILY.split(",")[varName];
        currentVal[varName] = current["daily"][varName][current["daily"]["time"].indexOf(currentDate.toISOString().slice(0, 10))];
    }
    return currentVal;
}
