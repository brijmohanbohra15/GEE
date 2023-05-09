
var roi = ee.FeatureCollection("projects/ee-b2bohra1995/assets/SA/nandurbar");

var id = 27
var sownMonth = 6
var harvetMonth = 11
var index = 'NDVI'   



var roi = roi.filter(ee.Filter.eq('id',id)).geometry()//.centroid()
// print(roi)

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

var indices = function(img){
  var ndvi = img.normalizedDifference(['B8','B4']).rename(['NDVI'])
  var mndwi = img.normalizedDifference(['B11','B3']).rename(['MNDWI'])
  return img.addBands(ndvi).addBands(mndwi)
}


// Add index
var dataset_s2 = dataset_s2.map(indices).select(index)
// print(dataset_s2)

var s2Chart = ui.Chart.image.series(dataset_s2.select(index), roi,ee.Reducer.median())
  .setChartType('ScatterChart')
  .setOptions({
  title: 'Sentinel 2  median ' + index + 'Time Series at ROI',
  // trendlines: {
  //   0: {color: 'CC0000'}
  // },
  lineWidth: 1,
  pointSize: 3,
  });
// print(s2Chart);


var withDates = dataset_s2.map(function(img) {
  return img.set('date', img.date().format('YYYY-MM-dd'))
})
var dates = withDates.aggregate_array('date')
// print(dates)
var mosaicList = withDates.aggregate_array('date')
  .distinct()
  .map(function(date) {
    var d = ee.Date(date)
    return dataset_s2.filterDate(d, d.advance(1, 'day')).mosaic().set('system:index', date)
  })
 
var mosaics = ee.ImageCollection.fromImages(mosaicList)
// print(mosaics)
// pixels intersecting the ROI.
var pixelInfoBbox = ee.List(dataset_s2.getRegion({
  geometry: roi,
  scale: 10
}));
// print(pixelInfoBbox,'pixel')

 
var head_remove =pixelInfoBbox.remove(pixelInfoBbox.get(0))
var ndvi = head_remove.map(function(list){
  var list_new =  ee.List(list).get(4)
  return list_new
})
// print(ndvi, 'ndvi')

var time = head_remove.map(function(list){
  var list_new =  ee.List(list).get(3)
  return list_new
})
// print(time, 'time')




var multiband = mosaics.toBands()//.clip(table);
// print(multiband)



var meanDictionary = multiband.reduceRegion({
  reducer: ee.Reducer.median(),
  geometry: roi,
  scale: 10,
  maxPixels: 1e9
});
print(meanDictionary)
// The result is a Dictionary.  Print it.
var median_list = meanDictionary.values();
// print(median_list)
var median_gte_25 = median_list.filter(ee.Filter.gte('item', .25))

print(median_gte_25.length(), 'Germination if value greater or equal to 1')
