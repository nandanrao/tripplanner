var test = Handlebars.templates.trip();
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

  var lookup = function(place, callback){
    // console.log('gmaps lookup');
    // Check if we have users location, if we don't, get it!
    if (!current_location){
      store_location.then(function(){
        lookup(place, callback)
      })
    }
    // If we have users location, lookup the item!
    else {
      var request = {
        location: current_location,
        radius: '20000',
        keyword: place.name,
      }
      googleSearch.nearbySearch(request, function(results, status){ 
        var error
        if (status !== 'OK'){
          error = status;
          place.deleted = true;
        }
        else {
          // set top result as chose
          place.chosenResult = results[0]
          // push other results to otherResults array
          for (var i=1, len=results.length; i<len; i++){
            place.otherResults.push(results[i]);
          }
          callback(place)
        }
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
        if (arr[i].g_id === el.start.g_id){
          if (arr[i+1].g_id === el.end.g_id){
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



// Handles submitting of places for bestRoute calculations, and return display... 
var controller = (function(){
  function enterKey(e){
    e.target.style.display = 'none';
    document.getElementById('inputForm').style.display = 'none';
    // check to see if all locations have been found, then calculate best route.
    storage.allFound.then(function(results){
      routeCalculator.calculate(storage.places, function(route){
        // Change the 'pos' property on each place object, based on best route
        for (var i=0, len=route.places.length; i<len; i++){
          route.places[i].pos = i+1;
        }
        // create a duration element and add it (should be template?)
        var dur = document.createElement('li');
        document.getElementById('places').appendChild(dur);
        dur.style.order = route.places.length + 1;
        dur.innerHTML = Math.round(route.duration) + ' min'
      })
    })
  }
  return {
    enter: enterKey,
  }
})();



// Creates new place objects from form input.
var input = (function(){
  // if store is empty, set counter to 0, else... 
  var counter = 0;
  var createPlaceObj = function(str){
    var place = {
      _id: '_' + Math.random().toString(36).substr(2, 9),
      init_str: str,
      name: str,
      pos : ++counter,
      _chosenResult: null,
      set chosenResult(newPlace){
        // copy the values we care about to main place object
        place.name = newPlace.name;
        place.g_id = newPlace.id;
        place.address = newPlace.vicinity;
        place.LatLng = newPlace.geometry.location;     
        // set our chosenResult object
        this._chosenResult = newPlace;
      },
      get chosenResult(){
        return this._chosenResult;
      },
      otherResults : [],
      deleted: false,
    };
    PubSub.publish('newInput', place) 
  };
  var setCounter = function(num){
    counter = num
  };
  return {
    newInput: createPlaceObj,
  }
})();

// Takes initial input from user
(function(){
var form = document.getElementById('inputForm')
form.onsubmit = function(e){
  var textBox = e.target.elements['input']; 
  input.newInput(textBox.value);
  textBox.value = '';
  return false;
}
})()

// Call gmaps lookup!
PubSub.subscribe('newInput', function(msg, place){
  place.found = new Promise(function(resolve, reject){
      gmaps.lookup(place, resolve)
  });
});





var viewOfPlace = (function(){
  var newPlace = function(place){
    // Create the (li) DOM element for this place (var el)
    var li = Handlebars.templates.place(place);
    var tempWrapper = document.createElement('ul');
    tempWrapper.innerHTML = li;
    el = tempWrapper.firstChild;

    // object to hold DOM elements
    li = {
      el : el,
      name: el.getElementsByClassName('name')[0],
      address: el.getElementsByClassName('address')[0],
      alternate: false,
    };

    var deleteBtn = document.createElement('span')
    deleteBtn.innerHTML = 'delete';
    deleteBtn.classList.add('delete');
    deleteBtn.onclick = function(){
      place.deleted = true;
    };

    var changeBtn = document.createElement('span');
    changeBtn.innerHTML = 'other';
    changeBtn.classList.add('change');
    changeBtn.onclick = showOtherResults;

    li.el.appendChild(changeBtn);
    li.el.appendChild(deleteBtn);
    // Append (li) element for this place
    document.getElementById('places').appendChild(li.el);
    // Create DOM element for alternate results for this place
    var ul = document.createElement('ul')
    ul.classList.add('alternates');
    // Add a click event for each place (to show alternates)
    li.name.onclick = showOtherResults

    function showOtherResults(){
      if (place.otherResults.length < 1){
        return
      }
      if (!li.alternate){
        li.el.classList.toggle('list-open');
        ul.style.display = 'block';
        li.alternate = true;
        ul.innerHTML = Handlebars.templates.alternates(place);
        li.el.appendChild(ul);
        // add click event to each alternate place to make it THE place!
        for (var i=0, len=ul.children.length; i<len; i++){   
          ul.children[i].onclick = function(e){
            var g_id = this.getAttribute('data-google-id');
            place.otherResults.forEach(function(el, i){
              if (el.id === g_id){
                var tempEl = place.chosenResult;
                place.chosenResult = el;
                place.otherResults.splice(i, 1);
                place.otherResults.unshift(tempEl);
              }
            })
            this.parentNode.innerHTML = '';
            li.el.classList.toggle('list-open');
            li.alternate = false;
          }
        }
      }
      else if (li.alternate){
        li.el.classList.toggle('list-open');
        li.alternate = false;
        ul.innerHTML = '';
      }
    }

    // Put a listener on each place object to bind view to object properties
    Object.observe(place, function(changes){
      changes.forEach(function(change){
        if (change.name === 'g_id'){
          li.name.innerHTML = place.name;
          li.address.innerHTML = place.address;
        } 
        if (change.name === 'pos'){
          li.el.style.order = place.pos;
        }
        if (change.name === 'deleted'){
          li.el.style.display = 'none';
          storage.destroy(place._id);
          Object.unobserve(place);
        }
      })
    })
  }

  return {
    newPlace : newPlace
  }

})();





// View Changes on new input
PubSub.subscribe('newInput', function(msg, place){
  viewOfPlace.newPlace(place);
});
 


// Show CALCULATE button when at least 3 places are entered.  
PubSub.subscribe('stored_places', function(msg, places){
  var calculateBtn = document.getElementById('calculate')
  if (storage.places.length > 2){
    calculateBtn.style.display = 'inline-block'; 
    calculateBtn.onclick = controller.enter;
  }
  else {
    calculateBtn.style.display = 'none';
  }
}) 


// Stores all our place objects in a nice array!
var storage = (function(){
  var places = [];
  var tripInfo = {};

  function set(place){
    places.push(place)
    PubSub.publish('stored_places', places)
  }

  function findById(id){
    places.forEach(function(place){
      if (place._id === id){
        return place
      }
    })
  }

  var allFound = new Promise (function (resolve, reject){
    var foundArray = [];
    places.forEach(function(place){
      foundArray.push(place.found)
    })
    Promise.all(foundArray).then(resolve())
  })

  function destroy(id){
    var i = places.indexOf(findById(id))
    places.splice(i);
    PubSub.publish('stored_places', places)
  }

  PubSub.subscribe('newInput', function(msg, obj){
    set(obj);
  });

  return {
    places: places,
    destroy: destroy,
    allFound: allFound,
  }
})();
