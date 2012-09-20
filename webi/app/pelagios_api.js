PelagiosWidget = function(){
	this.map  = undefined;
	this.root = undefined;
	this.points = undefined;
	this.annotations = undefined;
	this.autocompletedata = [];
	this.placesdata = {};
	var self = this;

	this.get_place_annotation = function (place){
	  var deferreds = [];
	  var docs = [];
	  $('#wait_annotations').html('<img src="img/ajax-loader-white.gif" />');
	  $.get(place.uri+"/datasets.json", function(data){
	  	$('#wait_annotations').html('');
	  	if (typeof(data) == 'string'){
	  		data = $.parseJSON(data);
	  	}
	    $.each(data , function(index,value){
	      if (typeof(value) == 'string'){
	  		value = $.parseJSON(value);
	  	  }	
	      deferreds.push($.get(value.uri+'/annotations.json?forPlace='+place.uri.split("/api/places/")[1], function(adata){
	      	  if (typeof(adata) == 'string'){
	  			adata = $.parseJSON(adata);
	  	      }
	          docs = $.merge(docs, adata.annotations);
	        }));
	    });  
	    $.when.apply(null, deferreds).done(function(){ 
	        self.annotations = docs;
	        self.refresh_annotations_list();
	      });  
	  });
	};

	this.reset_province = function(){
		self.reset_info();
		$('#pelagios_search').html('');
		//$('#' + self.root + ' #tags').typeahead().data('typeahead').source = [];
	};

	this.reset_info = function(){
		$('#'+self.root + ' #pelagios_annotations').html('');
		$('#pelagios_result').html('');
		$('#pelagios_province').html('');
		$('#'+self.root + ' #tags').val('');
	};

	function shortner(uri,n){
		return uri.substring(0,n)+'...';
	};

	this.refresh_annotations_list = function(){
		if (self.annotations.length == 0) return;
		$('#'+self.root + ' #pelagios_annotations').
					append($('<div>').attr('id','page_container').addClass('pcontainer').css('height','100%').
						append($('<div>').addClass('nav-header')).add('Annotations'));
		var ul = $('#'+self.root + ' #pelagios_annotations #page_container').append($('<ul>').addClass('content'));
		$.each(self.annotations,function(index, value) {
			if (value.target_title){
				$('#'+self.root + ' #pelagios_annotations ul').append($('<li>').append($('<a>').attr('href',value.uri.split('#')[0]).append(value.target_title)));
			} else {
				$('#'+self.root + ' #pelagios_annotations ul').append($('<li>').append($('<a>').attr('href',value.uri.split('#')[0]).append(shortner(value.uri,30))));
			}
		});
		ul.append($('<div>').addClass('page_navigation'));
		$('#'+self.root + ' #page_container').pajinate({
                    items_per_page : 10,
        });
        window.awld.init();
	}; 

	this.init = function(map , div){
			self.map = map;
			self.root = div;
			map.events.on({"zoomend": self.update_bbox});
		};

	this.focusProvince = function(province, placeslatlng, autocompletedata, placesdata){
		self.reset_info();
		$('#pelagios_province' ).html('<h3>Province of ' + province+'</h3>');
		self.points = placeslatlng;
		self.autocompletedata = autocompletedata;
		self.placesdata = placesdata;
		//
		$('#pelagios_search').html('<li class="nav-header" for="tags">Place: </li><input id="tags" style="width:100%;">');
		//
		var th = $('#' + self.root + ' #tags').typeahead({
			    onselect: function(value) {
			    	self.reset_info();
			    	var latlng = self.points[value];
  					self.map.moveTo(latlng.transform(WGS84,EPSG900913) , 12);
			    	var data = self.placesdata[value];
			    	self.get_place_annotation(self.placesdata[value]);
			        $("#pelagios_result").html("<br/><p><b>name:</b> " 
			                                + data.label +"<br/>"
			                                +"<b>description:</b> " 
			                                + data.comment
			                                + "</p>");
			    }});
        th.data('typeahead').source = self.autocompletedata;
	};

	this.update_bbox = function(){
		function getAnnotationsByBBox(bbox){
		  /*var pelapi = "http://pelagios.dme.ait.ac.at/api/places.json?bbox=";
		  //var bbox = map.getExtent().transform(EPSG900913, WGS84);
		  var req = pelapi+Math.min(bbox.left,bbox.right)
		            +","+Math.min(bbox.top,bbox.bottom)
		            +","+Math.max(bbox.left,bbox.right)
		            +","+Math.max(bbox.top,bbox.bottom);
		  var deferreds = [];
		  var docs = [];          
		  $.get(req, function(data){
		    $.each(data , function(index,value){
		      deferreds.push($.get(value.uri+"/datasets.json", function(datasets){
		          //docs = $.merge(docs, datasets);
		          //console.log(datasets);
		        }));
		    });  
		    $.when.apply(null, deferreds).done(function(){ 
		        showDatasets(docs);
		      });  
		  });*/
		};

		getAnnotationsByBBox(self.map.getExtent().transform(EPSG900913, WGS84));
	};
};
