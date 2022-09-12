var filter_coord =  [[[76.17402912139721, 30.88384413666161],
          [76.17402912139721, 30.86380632383314],
          [76.21248126983471, 30.86380632383314],
          [76.21248126983471, 30.88384413666161]]];
          

var currentDate = ee.Date(Date.now())
var startDate = [currentDate.advance(-1,'week')]
// print(currentDate)
var endDate = [currentDate]
var rgbVis = {min: 1000, max: 6500, bands: ['B4', 'B3', 'B2']}

// component

var c= {}
// map
c.map = ui.Map()
// info section
c.info = {}
c.info.titleLabel = ui.Label({value :'Know Your Cloud'
  , style :{fontSize : '24px'
,fontWeight: 'bold'
,textAlign :  'center'
    ,stretch :'horizontal'
    ,color: '4A997E'
  }
})
c.info.aboutLabel = ui.Label({value :'This web app visualize the sentinel 2 RGB images'
+' in ascending order of cloud percentage for selected date range ' 
+'and region with its date info'
  , style:{
    textAlign :'center'
  }
})
c.info.panel = ui.Panel([c.info.titleLabel, c.info.aboutLabel])

//This creates another panel to house a line separator and instructions for the user
c.instruction = ui.Label({
    value: '____________________________________________________',
    style: {fontWeight: 'bold',
    color: '4A997E'
      ,textAlign :  'center'
      ,stretch :'horizontal'
    },
 
  // ui.Label({
  //   value:'Select layers to display.',
  //   style: {fontSize: '15px', fontWeight: 'bold'}
  // })
  });

// Date Panel 
c.selectDate ={}
c.selectDate.startDateLabel = ui.Label({value :'Select Start Date'
  , style:{fontWeight:'bold'}
})
c.selectDate.startDateSlider = ui.DateSlider({
  start :'2019-12-31'
  ,onChange : fx_startDate
  // ,disabled :true
  ,style:{stretch :'horizontal'
    // ,shown: false
  }})
c.selectDate.startDatepanel = ui.Panel(
  {
    widgets:[c.selectDate.startDateLabel, c.selectDate.startDateSlider],
    layout :ui.Panel.Layout.flow('horizontal')
  })
// end date  // 
c.selectDate.endDateLabel = ui.Label({value :'Select End Date '
,style:{fontWeight:'bold'}})
c.selectDate.endDateSlider = ui.DateSlider({ start :'2020-01-02'
, onChange : fx_endDate
  ,style:{stretch :'horizontal'}
})
c.selectDate.endDatepanel = ui.Panel(
  {
    widgets:[c.selectDate.endDateLabel, c.selectDate.endDateSlider]
    ,layout :ui.Panel.Layout.flow('horizontal')
  })
c.selectDate.panel = ui.Panel({widgets:[c.selectDate.startDatepanel,
c.selectDate.endDatepanel]
})
// Draw Region of Interest
c.roi ={}
c.roi.label = ui.Label({value :'Draw Region of Interest',
  style:{fontWeight:'bold'}
}) 
    //Get the drawing tools widget object
var drawingTools = c.map.drawingTools()
    // Hide the default drawing tools 
drawingTools.setShown(false)
    // Setup a while loop to clear all existing geometries
while (drawingTools.layers().length()>0){
      var layer = drawingTools.layers().get(0);
      drawingTools.layers().reomve(layer);
}
    // Initialize a dummy GeometryLayer
var dummyGeometry = ui.Map.GeometryLayer(
  {geometries : null, name :'geometry', color :'23cba7'}
  );
drawingTools.layers().add(dummyGeometry);
    // Define the geometry clearing function
function clearGeometry(){
  var layers = drawingTools.layers();
  layers.get(0).geometries().remove(layers.get(0).geometries().get(0))
}
    // define function for rectangle 
function drawRectangle(){
  clearGeometry();
  drawingTools.setShape('rectangle');
  drawingTools.draw();
}
var symbol = {
  rectangle: '⬛',
  polygon: '🔺',
  point: '📍',
};
c.roi.button =ui.Button({
  label : symbol.rectangle + 'Rectangle',
  onClick : drawRectangle,
  style : {stretch :'horizontal'}
})

c.roi.panel = ui.Panel([c.roi.label, c.roi.button])
// Visulaize image by date 
c.imageDate ={}
c.imageDate.label = ui.Label({value:'Select image date to Visualize'
  ,style:{fontWeight :'bold'}
})
c.imageDate.select= ui.Select({
  items:[],
  placeholder :'Select Date'
  ,style : {
    // width :'350px'
    stretch :'horizontal'
    , textAlign :'center'
  }
  ,onChange: renderDateImage,
})
c.imageDate.panel = ui.Panel({widgets:[c.imageDate.label, c.imageDate.select]
 // , style :{ position :'top-left'}
})



// control panel
c.controlPanel = ui.Panel({style:{width:'350px'}})



// Composite

c.controlPanel.add(c.info.panel)
c.controlPanel.add(c.instruction)
c.controlPanel.add(c.selectDate.panel)
c.controlPanel.add(c.roi.panel)
c.map.add(c.imageDate.panel)

ui.root.clear()
ui.root.add(c.controlPanel)
ui.root.add(c.map)


// Behaviour
function maskCloudAndshadowSR(image){
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(5);
  var snow = snowProb.lt(5);
  var scl = image.select('SCL');
  var shadow = scl.eq(3); //3 = clouds shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  var ndwi = image.normalizedDifference(['B3', 'B8']).gt(0.0)//.rename(['ndwi'])
  // Cloud prbability less than 5 % or cloud shadow classfication
  var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1)).and(ndwi);
  return image.updateMask(mask).copyProperties(image,["system:time_start"]);
}

function fx_startDate(value){
  var selectedStartDt = value

  var x =(selectedStartDt.start()).format("YYYY-MM-dd")
  
  startDate.push(x)
  filterData()
  imageDate()
}

function fx_endDate(value){
  var selectedEndtDt = value
  var y =(selectedEndtDt.start()).format("YYYY-MM-dd")
  endDate.push(y)
  filterData()
  imageDate()
}
function addPercent(image){
    var lt = filter_coord.length
    var bound = ee.Geometry.Polygon(filter_coord[lt-1])
    var unmask = image.select('B1').reduceRegion({
        reducer: ee.Reducer.count(),
        geometry: bound,
        scale: 30,
        maxPixels: 1e9
        });
    var total_pixel = ee.Number(unmask.get('B1'));
// print(total_pixel)
    var cloudProb = image.select('MSK_CLDPRB');
    var snowProb = image.select('MSK_SNWPRB');
    var cloud = cloudProb.lt(5);
    var snow = snowProb.lt(5);
    var scl = image.select('SCL');
    var shadow = scl.eq(3); //3 = clouds shadow
    var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud prbability less than 5 % or cloud shadow classfication
    var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1));
    var masked = image.select('MSK_CLDPRB').updateMask(mask).reduceRegion({
        reducer: ee.Reducer.count(),
        geometry: bound,
        scale: 30,
        maxPixels: 1e9
      });
    var total_masked_pixel = ee.Number(masked.get('MSK_CLDPRB'))
    var percentage =(ee.Number(1).subtract((total_masked_pixel.divide(total_pixel)))).multiply(ee.Number(100))
    return image.set('percentage', percentage)
    }
//  filter data
function filterData(){
  var lt = filter_coord.length
  var st_dt_lt = startDate.length
  var ed_dt_lt = endDate.length
  var bound = ee.Geometry.Polygon(filter_coord[lt-1])
  var dataset = ee.ImageCollection("COPERNICUS/S2_SR")
              .filterDate(startDate[st_dt_lt-1],endDate[ed_dt_lt-1])
              .filterBounds(bound)
              //.map(maskCloudAndshadowSR)
  // print(startDate[st_dt_lt-1], 'filterData')
  var withDates = dataset.map(function(img) {
  return img.set('date', img.date().format('YYYY-MM-dd'))
        })
   var mosaicList = withDates.aggregate_array('date')
  .distinct()
  .map(function(date) {
    var d = ee.Date(date)
    return dataset.filterDate(d, d.advance(1, 'day')).mosaic().set('system:index', date)
  })
  var mosaics_no= ee.ImageCollection.fromImages(mosaicList).map(function(image) {return image.clip(bound)})
  var visImg = mosaics_no.map(addPercent).sort('percentage')
    return visImg
}

//Image date list
function imageDate(){
  var lt = filter_coord.length
  var imgDateList = (filterData()).aggregate_array('system:index');
  var  percentage_list = ((filterData()).aggregate_array('percentage')).map(function(e2){
      var x2 = ee.Number(e2).format('%.3f');
      return x2});
  // print(ee.List(imgDateList))
  // print(ee.List(percentage_list))
  var  combine = (((imgDateList)).zip(ee.List(percentage_list))).map(function(e2){
     var x2 = ((ee.String(ee.List(e2).get(0))).cat(ee.String(' With Cloud (%):'))).cat(ee.String(ee.List(e2).get(1)));//+'_'+ee.List(e2).get(1)//ee.String(e2[0])+ ee.String(e2[1]);
       //print(x2)
      
      return x2
      });
 
  // print(combine.getInfo());
  (c.imageDate.select).items().reset(combine.getInfo());
  }




//Function to display the corresponding image to the user-selected date (from the dropdown menu)
function renderDateImage(value) {
  var date = value.slice(0,10);
  // print(date)
  var image = ee.Image((filterData())
    .filter(
      ee.Filter.eq('system:index',date)
    ).first())

  var start_str = image.get('system:index')
  
 
  
  var layer = ui.Map.Layer(image, rgbVis, 'Mosaic_RGB_img_'+start_str.getInfo(), true)
  c.map.layers().reset([layer])
  var lt = filter_coord.length
  var bound = ee.Geometry.Polygon(filter_coord[lt-1])
  c.map.centerObject(bound, 10)
}

// Returns the filtered image for the selected ROI

function chartNdviTimeSeries() {
  // Get the drawn geometry; it will define the reduction region.
  var roi = drawingTools.layers().get(0).getEeObject();
  var roi_coord = roi.coordinates()
  
  filter_coord.push(roi_coord)
   // Set the drawing mode back to null; turns drawing off.
  drawingTools.setShape(null);
  var layers =drawingTools.layers()
  layers.get(0).setShown(false)
  // calling filterData function 
  filterData()
  imageDate()
 }

drawingTools.onDraw(ui.util.debounce(chartNdviTimeSeries, 500));
drawingTools.onEdit(ui.util.debounce(chartNdviTimeSeries, 500));
