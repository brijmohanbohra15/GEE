var id = 1  //  if field centroid is needed.
var sownMonth = 5
var harvetMonth = 11
var index = 'NDVI'   // 'MNDWI'


var roi = ee.FeatureCollection('projects/ee-b2bohra1995/assets/SA/cropField')
// var roi = roi.filter(ee.Filter.eq('id',id)).geometry()//.centroid()
print(roi)

//masking clouds using SCL bnad

function maskCloudAndshadowSR(image){
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(5);
  var snow = snowProb.lt(5);
  var scl = image.select('SCL');
  var shadow = scl.eq(3); //3 = clouds shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud prbability less than 5 % or cloud shadow classfication
  var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1));
  // mask mean contain that area
  return image.updateMask(mask).divide(10000).copyProperties(image,["system:time_start"]);
}

var dataset_s2 = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filter(ee.Filter.calendarRange(sownMonth, harvetMonth, 'month'))
                  .filterBounds(roi)
                  .filterDate('2022', '2023')
                  // Pre-filter to get less cloudy granules.
                  //.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskCloudAndshadowSR);
// print(dataset_s2)

//function for NDWI
var indices = function(img){
  var date = img.date();
  var years = date.difference(ee.Date('2019-01-01'), 'year');
  // Return the image with the added bands.
  var ndvi = img.normalizedDifference(['B8','B4']).rename(['NDVI'])
  var mndwi = img.normalizedDifference(['B11','B3']).rename(['MNDWI'])
  return img.addBands(ndvi).addBands(mndwi).addBands(ee.Image(years).rename('t')).float()
  .addBands(ee.Image.constant(1))
}
  
// Add index
var dataset_s2 = dataset_s2.map(indices)//.select(index)
print(dataset_s2)


// //clip image collection
// var mndwi_clip = mndwi.map(function(image){return image.clip(roi)}).toBands();
// // print(mndwi_clip)

// chart

// Plot a time series of NDVI at a single location.
// var layer_name = 
Map.centerObject(roi, 11);
Map.addLayer(dataset_s2,
  {bands: index, min: 0.1, max: 0.9, palette: ['white', 'green']},
  index + ' Mosaic');
Map.addLayer(roi, {color: 'yellow'}, 'ROI');
var s2Chart = ui.Chart.image.seriesByRegion({
  imageCollection : dataset_s2.select(index), 
  regions :roi,
  reducer:ee.Reducer.median()
  ,seriesProperty:'id'})
  .setChartType('ScatterChart')
  .setOptions({
  title: 'Sentinel 2 ' + index + 'Time Series at ROI',
  trendlines: {
    0: {color: 'CC0000'}
  },
  lineWidth: 1,
  pointSize: 3,
  });
print(s2Chart);


// Fit this trend model to the Sentinel-2 based indices  
// using Ordinary Least Squares (OLS),
// List of the independent variable names.
var independents = ee.List(['constant', 't']);
// Name of the dependent variable.
var dependent = index;
// Compute a linear trend. This will have two bands: 'residuals' and
// a 2x1 band called 'coefficients' (columns are for dependent variables).
var trend = dataset_s2.select(independents.add(dependent))
  .reduce(ee.Reducer.linearRegression(independents.length(), 1));
// print(trend,'trend')
// Map.addLayer(trend, {}, 'Trend Array Image');

// Flatten the coefficients into a 2-band image.
var coefficients = trend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([independents]);
// print(coefficients,'coeffi' )  

// Compute a detrended series.
var detrended = dataset_s2.map(function(image) {
  return image.select(dependent).subtract(
    image.select(independents).multiply(coefficients).reduce('sum'))
    .rename(dependent)
    .copyProperties(image, ['system:time_start']);
});


// Use the model to "detrend" the original time series. 
// By detrend, we mean account for the slope of the chart 
// and remove it from the original data
var detrendedChart = ui.Chart.image.series(detrended, roi, null, 30)
  .setOptions({
    title: 'Detrended Sentinel-2 '+ index+' Time Series at ROI',
    lineWidth: 1,
    pointSize: 3,
  });
print(detrendedChart);

// Estimate seasonality with a harmonic model
// Use these independent variables in the harmonic regression.

// add the harmonic variables (the third and fourth terms
// of equation 2) to the image collection.
var harmonicIndependents = ee.List(['constant', 't', 'cos', 'sin']);
// Add harmonic terms as new image bands.
var harmonicS2 = dataset_s2.map(function(image) {
  var timeRadians = image.select('t').multiply(2 * Math.PI);
    return image
      .addBands(timeRadians.cos().rename('cos'))
      .addBands(timeRadians.sin().rename('sin'));
  });
// Fit the model with a linear trend, using the linearRegression() reducer:
var harmonicTrend = harmonicS2
  .select(harmonicIndependents.add(dependent))
  // The output of this reducer is a 4x1 array image.
  .reduce(ee.Reducer.linearRegression({
   numX: harmonicIndependents.length(),
   numY: 1
  }));
  
  // Plug the coefficients into equation 2 in order
  // to get a time series of fitted values:
  
  // Turn the array image into a multi-band image of coefficients.
var harmonicTrendCoefficients = harmonicTrend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([harmonicIndependents]);
// Compute fitted values.
var fittedHarmonic = harmonicS2.map(function(image) {
  return image.addBands(
    image.select(harmonicIndependents)
      .multiply(harmonicTrendCoefficients)
      .reduce('sum')
      .rename('fitted'));
});
// Plot the fitted model and the original data at the ROI.
print(ui.Chart.image.series(fittedHarmonic.select(['fitted', index]), roi,
      ee.Reducer.mean(), 30)
  .setSeriesNames([index, 'fitted'])
  .setOptions({
    title: 'Harmonic Model: Original and Fitted Values',
    lineWidth: 1,
    pointSize: 3
  })
);
