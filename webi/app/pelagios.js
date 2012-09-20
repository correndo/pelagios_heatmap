var map, cartodblayer, oldmap;
var infowindow;
var province;
var center;
var heatmap , osmlayer;
var radius = 7;
var izoom = 5;
var placesdata = {};
var placeslatlng = {};
var autocompletedata = [];
var WGS84 = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
var lambert =  new OpenLayers.Projection("EPSG:42103"); //Lambert conical conformant
var EPSG900913 = new OpenLayers.Projection("EPSG:900913");   
var currentProvinceName = "";
var pelagiosw;
var selectc;
var mapMinZoom = 5;
var mapMaxZoom = 10;
var maxExtent = new OpenLayers.Bounds(  -20037508, -20037508, 20037508, 20037508.34    );
var apiurl = 'http://pelagios.ecs.soton.ac.uk';

function get_my_url (bounds) {
    var res = this.map.getResolution();
    var x = Math.round ((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
    var y = Math.round ((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
    var z = this.map.getZoom();
    var limit = Math.pow(2, z);
    var path = z + "/" + x + "/" + y + "." + this.type; 
    var url = this.url;
    if (y < 0 || y >= limit) {
        return url+"pics/empty256.png";
	} else {
        if (url instanceof Array) {
            url = this.selectUrl(path, url);
        }
        return url + path;
	}
}

function getRadius(zoom){
  var value = Math.round(zoom+3);
  if (value <= 5) return 5;
  if (value >= 10) return 10;
  else return value;
};

function showDatasets(datasets){
  var dscontent = "";
  $.each(datasets, function(index, element){
      if (element.uri !=undefined){
        dscontent += "<br/><p><a href=\""+element.uri+"\">"+element.title+"</a><br/>"
                    +element.description+"</p>";
      }
  });
  $("#pelagios_dataset").html(dscontent);
  $( "#info" ).modal({show: true});
};

function showDataset(resuri){
  $.get(resuri+"/datasets.json" , function(data){
    var dscontent = "";
    $.each(data, function(index, element){
      if (element.uri !=undefined){
        dscontent += "<br/><p><a href=\""+element.uri+"\">"+element.title+"</a><br/>"
                    +element.description+"</p>";
      }
    });
    $("#pelagios_dataset").html(dscontent);
  });
};

function initInterface(){
  $($('a[href="#"]')).on('click' , function(){ 
    pelagiosw.reset_province();
    heatmap.setDataSet({data:[]});
    map.zoomToExtent(cartodblayer.getDataExtent());});
  $("#aboutWindow").modal('hide',{title : 'About'});
  $("#contactWindow").modal('hide',{title : 'Contacts'});
  
  $( "#about").button().on('click' , function(){
      $("#aboutWindow").modal({show: true});
    });   
  $( "#contact").button().on('click' , function(){
      $("#contactWindow").modal({show: true});
    });      
};


function zoom(place){
  var latlng = placeslatlng[place];
  map.moveTo(latlng.transform(WGS84,EPSG900913) , 12);
};




function handleMapChange(){ 
  heatmap.heatmap.set('radiusOut',getRadius(map.getZoom()));
	heatmap.heatmap.set('radiusIn',getRadius(map.getZoom())/2);
};

function initialize() {
        
      map = new OpenLayers.Map({  div: "map" , 
                                  zoom : izoom , 
                                  projection: EPSG900913,                          
                                  displayProjection: lambert});
      osmlayer = new OpenLayers.Layer.OSM({ projection: WGS84 });
      hlayer = new OpenLayers.Layer.TMS("Name" , "http://pelagios.dme.ait.ac.at/tilesets/imperium/", { 
      	   'layername':'Historical',
      	   'isBaseLayer':false,
		   'type':'png',
		   'transparent':true,
		   'projection':EPSG900913,
		   'numZoomLevels': null,
		   'minZoomLevel':5,
		   'maxZoomLevel':10,
		   'getURL':get_my_url
	    });


      heatmap = new OpenLayers.Layer.Heatmap( "Heatmap Layer", map, osmlayer, {visible: true, radius:4}, {isBaseLayer: false, 
                                                                  opacity: 0.3 , projection: EPSG900913});
      cartodblayer = new OpenLayers.Layer.Vector("Vectors", {
                    style: {
                        'strokeWidth': 1,
                        'strokeColor': '#FF0000',
                        'fillColor': '#FFAD33',
                        'fillOpacity': 0.4
                    },
                    projection: WGS84,
                    displayProjection: EPSG900913 ,
                    strategies: [new OpenLayers.Strategy.Fixed()],
                    protocol: new OpenLayers.Protocol.Script({
                        url: "http://correndo.cartodb.com/api/v2/sql",
                        params: {q: "select * from roman_provinces_ad_117",format:"geojson"},
                        format: new OpenLayers.Format.GeoJSON({
                            ignoreExtraDims: true
                        }),
                        callbackKey: "callback",
                        
                    }),
                    eventListeners: {
                        "featuresadded": function () {
                            this.map.zoomToExtent(this.getDataExtent());
                        } ,
                        "featureselected": function (feature) {
                          currentProvinceName = feature.feature.attributes.name;
                          pelagiosw.reset_info();
                          focusprovince();
                          this.map.zoomToExtent(feature.feature.geometry.getBounds());
                        }
                    }
                });
        var selectFeature = new OpenLayers.Control.SelectFeature(cartodblayer);

        var control = new OpenLayers.Control.GetFeature({
                protocol: new OpenLayers.Protocol.Script({ 
                  callback:function(object){
                    console.log("callback ", object);
                  },
                  read:function(object){
                    console.log("read ", object.filter.value);
                    return false;
                  }}),
                box: true,
                hover: true
            });
        control.events.register("featureselected", this, function(e) {
            console.log("featureselected",e);
        });
        control.events.register("featureunselected", this, function(e) {
            console.log("featureunselected",e);
        });
        control.events.register("hoverfeature", this, function(e) {
            console.log("hoverfeature",e);
        });
        control.events.register("outfeature", this, function(e) {
            console.log("outfeature",e);
        });
        map.addControl(control);

        //control.activate();
        map.addLayers([ hlayer, osmlayer ,cartodblayer, heatmap ]);
        map.addControl(selectFeature);
        map.events.on({"zoomend": handleMapChange});
        pelagiosw = new PelagiosWidget();
        pelagiosw.init(map,'pelagios-data');
        //map.zoomToMaxExtent();
        selectFeature.activate();

        //test
 
        //selectc.activate();
        //test
        initInterface();
  }

function focusprovince(){
    var name = currentProvinceName;
    $('#wait_province').html('<img src="img/ajax-loader-black.gif" />');
    $.get(apiurl+'/pelagios/places/annotations/117/'+ name, function(data) { 
        if (typeof(data) == 'string'){
	  			data = $.parseJSON(data);
	  	  }
        $('#wait_province').html('');
        var provinceData = {
    		  max: 1,
    		  data: new Array(),
        };
        placeslatlng = {};
        var max = 0;
        autocompletedata = [] ;
        placesdata = {};
        $.each(data,function(index, value) {          
        	if (value.point){
	            var latlon = new OpenLayers.LonLat(value.point[0], value.point[1]);
	            latlon.transform(WGS84,EPSG900913);
	            if (value.label != undefined){
	              autocompletedata.push(value.label);
	              placesdata[value.label] = value;
	              placeslatlng[value.label] = new OpenLayers.LonLat(value.point[0], value.point[1]);
	            }
	            provinceData.data.push({
	                lonlat: latlon, 
	                count: Math.round(Math.log(value.number + 1)+1),
	            });
	            max = Math.max(max , Math.round(Math.log(value.number + 1)+1));
	        }
        }); 
        pelagiosw.focusProvince(name,placeslatlng, autocompletedata, placesdata);
        provinceData.max = max;
        heatmap.setDataSet(provinceData);
    });
};

function handleMapChange(){
  if (map.getZoom() > 8){
    cartodblayer.setVisibility(false);
  }  else {
    cartodblayer.setVisibility(true);
  }
if (map.getZoom() > 4 && map.getZoom() < 11){
    hlayer.setVisibility(true);
  }  else {
    hlayer.setVisibility(false);
  }

	heatmap.heatmap.set('radiusOut',getRadius(map.getZoom()));
	heatmap.heatmap.set('radiusIn',getRadius(map.getZoom())/2);
}
