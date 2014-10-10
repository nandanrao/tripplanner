var test = Handlebars.templates.trip({tripname: 'booyah'});
document.body.innerHTML = test;



var gmaps = (function(){
  // Variables!!
  var api_key = 'AIzaSyBk1GgkGr-z29nhF7AFCKmdNEz472Un5oQ';
  var current_location;
  var googleSearch = new google.maps.places.PlacesService(document.createElement('div'));
  var googleDirections = new google.maps.DirectionsService();

  // store_location needs Modernizer + alerts for error handling / user denying / timeout reminder/ etc!
  var store_location = new Promise(function(resolve, reject) {
    navigator.geolocation.getCurrentPosition(function(position){
      current_location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      resolve();
    });
  });

  var lookup = function(name, resolve){
    // Check if we have users location, if we don't, get it!
    if (!current_location){
      store_location.then(function(){
        lookup(name, resolve)
      })
    }
    // If we have users location, lookup the item!
    else {
      var request = {
        location: current_location,
        radius: '20000',
        keyword: name,
      }
      googleSearch.nearbySearch(request, function(results, status){
        // create place and return it!
        var place = {
          id: results[0].id,
          name : results[0].name,
          address : results[0].vicinity,
          LatLng : results[0].geometry.location,
        }
        resolve(place)
      })
    }
  };

  var distance = function(a, b, callback){
    // console.log(a, b);
    // a and b = {lat, long
    var rando = {
      origin: a.LatLng,
      destination: b.LatLng,
      travelMode: google.maps.TravelMode.TRANSIT, 
    }
    // var directionsDisplay = new google.maps.DirectionsRenderer();
    googleDirections.route(rando, function(result, status){
      // directionsDisplay.setPanel(document.getElementById('directions'));
      // directionsDisplay.setDirections(result);
      // console.log(result, status)
      if (status == 'OVER_QUERY_LIMIT') {
        setTimeout(function(){
          distance(a, b, callback)
        }, 500) 
        return;
      }
      callback(result.routes[0].legs[0].duration.value/60)
    });
  };
  
  // API
  return {
    lookup: lookup, 
    distance: distance,
    current_location: current_location,
  }
})();


var routeCalculator = (function(){
  // for each el in arr
  function createLegs(arr){
    // Take off the starting point, create an array to hold results
    var resultsArr = [];
    var start = arr.shift();
    // Add every combination to resultsArr
    arr.forEach(function(el){
      resultsArr.push([start, el]);
      var tempArr = arr.concat();
      tempArr.splice(tempArr.indexOf(el), 1);
      tempArr.forEach(function(otherEl){
        resultsArr.push([el, otherEl])
      });
    });
    // put start back in the front!
    arr.unshift(start)
    // return the array with every possible pair
    return resultsArr;
  }

  // takes an array of pairs, creates objects with durations
  function measureLegs(arr, cb){
    hash = [];
    function getDuration(arr, callback){
      // console.count('getDuration has: ', arr[0].LatLng, arr[1].LatLng)
      gmaps.distance(arr[0], arr[1], function(dur){
        console.count('google answered!')
        var obj = {};
        obj.start = arr[0];
        obj.end = arr[1];
        obj.duration = dur;
        hash.push(obj)
        callback(null)
      });
    };
    async.eachSeries(arr, getDuration, function(err){
      cb(hash)  
    })
  }

  function routes(arr){
    // an array of arrays!
    var start = arr.shift()
    var finalArr = [];
    // resursing function to collect all options!
    function collect(arr, resultsArr){
      var resultsArr = resultsArr || [];
      if (arr.length === 1){
        resultsArr.push(arr[0]);
        resultsArr.unshift(start);
        finalArr.push(resultsArr);
        return; 
      }
      arr.forEach(function(el, i){
        var tempArr = arr.concat();
        var tempResults = resultsArr.concat();

        tempResults.push(el);
        tempArr.splice(tempArr.indexOf(el), 1);

        collect(tempArr, tempResults);
      })
    }
    // run collect
    collect(arr)
    // return start back to it's place!
    arr.unshift(start);
    // return
    return finalArr;
  } 

  // takes an array of arrays of places
  function bestRoute (arr, hash){
    // each array of places
    var newArr = []
    arr.forEach(function(el){
      var obj = {
        duration: calculateRoute(el, hash),
        places: el,
      }
      newArr.push(obj);
    })
    // sort by lowest time
    newArr.sort(function(a, b){
      return a.duration - b.duration;
    })
    return newArr[0];
  }

  // takes an array of places (helper for bestRoute)
  function calculateRoute(arr, hash){
    var totalDuration = 0;
    for (var i=0, len=arr.length; i<len-1; i++){
      hash.forEach(function(el){
        if (arr[i].id === el.start.id){
          if (arr[i+1].id === el.end.id){
            totalDuration += el.duration
          }
        }
      })
    }
    return totalDuration
  }
  // magic ties everything together in the right order!
  var magic = function(arr, callback){
    // Create an array of all possible routes
    var routesArr = routes(arr);
    // Create an array of each unique leg in the trip
    var legs = createLegs(arr);
    // Measure the duration of each leg of the trip
    // return an array with all legs and their durations
    measureLegs(legs, function(hash){
      var route = bestRoute(routesArr, hash);
      callback(route)
    });  
  }
  // API
  return {
    calculate: magic,
  }
})();



var lincoln = new Promise(function(resolve, reject){
  gmaps.lookup('lincoln center', resolve)
});

var coop = new Promise(function(resolve, reject){
  gmaps.lookup('parkslope food coop', resolve)
});

var fullstack = new Promise(function(resolve, reject){
  gmaps.lookup('fullstack academy of code', resolve)
});

var videofree = new Promise(function(resolve, reject){
  gmaps.lookup('video free brooklyn', resolve)
});


// TODO: make sure results come back in order? 
Promise.all([lincoln, coop, fullstack, videofree]).then(function(arr){
  routeCalculator.calculate(arr, function(results){
    console.log(results)
  })
});

